defmodule MinhaCasaAi.Workspace.ListingFeatures do
  @moduledoc """
  Workspace listing feature catalog (system defaults + profile overrides/custom options).
  """

  import Ecto.Query

  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.{ListingFeatureCatalog, Profile}

  @system_defaults [
    %{key: "pool", label: "Piscina", sort_order: 0},
    %{key: "gym", label: "Academia", sort_order: 1},
    %{key: "doorman24h", label: "Portaria 24h", sort_order: 2},
    %{key: "unobstructedView", label: "Vista livre", sort_order: 3},
    %{
      key: "heatedPool",
      label: "Piscina térmica",
      sort_order: 4
    },
    %{key: "cornerLot", label: "Esquina", sort_order: 5},
    %{key: "penthouse", label: "Cobertura", sort_order: 6},
    %{key: "garden", label: "Jardim", sort_order: 7},
    %{key: "singleStory", label: "Térrea", sort_order: 8}
  ]

  def default_system_options do
    Enum.map(@system_defaults, fn default ->
      %{
        key: default.key,
        label: default.label,
        source: "system",
        visible: true,
        sort_order: default.sort_order
      }
    end)
  end

  def list_catalog(profile) do
    rows =
      ListingFeatureCatalog
      |> Profile.scope_query(profile)
      |> Repo.all()

    merge_catalog(rows)
  end

  def merge_catalog(rows) when is_list(rows) do
    by_key = Map.new(rows, &{&1.key, &1})
    system_keys = MapSet.new(@system_defaults, & &1.key)

    system_options =
      Enum.map(@system_defaults, fn default ->
        case Map.get(by_key, default.key) do
          nil ->
            option_from_default(default)

          row ->
            option_from_row(row, default)
        end
      end)

    custom_options =
      rows
      |> Enum.filter(fn row ->
        row.source == "custom" and not MapSet.member?(system_keys, row.key)
      end)
      |> Enum.map(&option_from_row(&1, nil))

    (system_options ++ custom_options)
    |> Enum.sort_by(&{&1.sort_order, &1.label})
  end

  def replace_catalog(profile, features) when is_list(features) do
    profile_values = Profile.profile_values(profile)
    keys = Enum.map(features, & &1["key"])

    if length(keys) != length(Enum.uniq(keys)) do
      {:error, :duplicate_keys}
    else
      Repo.transaction(fn ->
        Enum.each(features, fn item ->
          attrs =
            item
            |> feature_attrs()
            |> Map.merge(profile_values)

          upsert_catalog_row(profile, attrs)
        end)

        hide_removed_customs(profile, MapSet.new(keys))
        list_catalog(profile)
      end)
    end
  end

  def catalog_keys(catalog) when is_list(catalog), do: Enum.map(catalog, & &1.key)

  def normalize_listing_features(listing, catalog) when is_map(listing) do
    features = Map.get(listing, "features") || %{}
    catalog_keys = catalog_keys(catalog)

    Enum.reduce(catalog, %{}, fn option, acc ->
      key = option.key
      value = Map.get(features, key)
      value = if value in [true, false], do: value, else: nil

      Map.put(acc, key, value)
    end)
    |> then(fn normalized ->
      Enum.reduce(catalog_keys, normalized, fn key, acc ->
        if Map.has_key?(acc, key), do: acc, else: Map.put(acc, key, nil)
      end)
    end)
  end

  def listing_parse_schema_properties(catalog) when is_list(catalog) do
    feature_properties =
      catalog
      |> catalog_keys()
      |> Enum.reduce(%{}, fn key, acc ->
        Map.put(acc, key, %{"type" => ["boolean", "null"]})
      end)

    %{
      "features" => %{
        "type" => "object",
        "properties" => feature_properties,
        "required" => Map.keys(feature_properties),
        "additionalProperties" => false
      }
    }
  end

  def feature_list_for_prompt(catalog) when is_list(catalog) do
    catalog
    |> Enum.map(fn option ->
      "- #{option.key}: #{option.label}"
    end)
    |> Enum.join("\n")
  end

  defp option_from_default(default) do
    %{
      key: default.key,
      label: default.label,
      source: "system",
      visible: true,
      sort_order: default.sort_order
    }
  end

  defp option_from_row(row, default) do
    %{
      key: row.key,
      label: row.label || (default && default.label),
      source: row.source,
      visible: row.visible,
      sort_order: row.sort_order
    }
  end

  defp feature_attrs(item) when is_map(item) do
    %{
      key: item["key"] || item[:key],
      label: item["label"] || item[:label],
      source: item["source"] || item[:source] || "custom",
      visible: item["visible"] != false and item[:visible] != false,
      sort_order: parse_int(item["sortOrder"] || item[:sort_order], 0)
    }
  end

  defp parse_int(value, _default) when is_integer(value), do: value

  defp parse_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> default
    end
  end

  defp parse_int(_, default), do: default

  defp upsert_catalog_row(profile, attrs) do
    case get_row(profile, attrs.key) do
      nil ->
        %ListingFeatureCatalog{}
        |> ListingFeatureCatalog.changeset(attrs)
        |> Repo.insert!()

      row ->
        row
        |> ListingFeatureCatalog.changeset(attrs)
        |> Repo.update!()
    end
  end

  defp get_row(profile, key) do
    ListingFeatureCatalog
    |> Profile.scope_query(profile)
    |> where([r], r.key == ^key)
    |> Repo.one()
  end

  defp hide_removed_customs(profile, kept_keys) do
    system_keys = MapSet.new(@system_defaults, & &1.key)

    ListingFeatureCatalog
    |> Profile.scope_query(profile)
    |> where([r], r.source == "custom")
    |> Repo.all()
    |> Enum.each(fn row ->
      if not MapSet.member?(kept_keys, row.key) and not MapSet.member?(system_keys, row.key) do
        row
        |> ListingFeatureCatalog.changeset(%{visible: false})
        |> Repo.update!()
      end
    end)
  end
end
