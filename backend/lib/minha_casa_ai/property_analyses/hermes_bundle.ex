defmodule MinhaCasaAi.PropertyAnalyses.HermesBundle do
  @moduledoc """
  Prepares a filesystem bundle consumed by Hermes analysis steps.
  """

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.ListingImages
  alias MinhaCasaAi.PropertyAnalyses.{ImageSources, Limits, ListingFacts}

  def prepare!(analysis, listing) do
    root = Path.join(Config.hermes_jobs_dir(), analysis.id)
    File.rm_rf!(root)
    File.mkdir_p!(Path.join(root, "images"))

    listing_data = listing.data || %{}
    sources =
      listing.id
      |> ImageSources.list(listing_data)
      |> Enum.take(Limits.max_images())

    images = write_images!(root, listing.id, sources)
    listing_facts = ListingFacts.from_listing_data(listing_data)

    input = %{
      "analysisId" => analysis.id,
      "listingId" => listing.id,
      "collectionId" => listing.collection_id,
      "profile" => %{
        "userId" => analysis.user_id,
        "orgId" => analysis.org_id
      },
      "input" => scrub_map(analysis.input || %{}),
      "listingData" => scrub_map(listing_data),
      "listingFacts" => listing_facts,
      "limits" => %{
        "maxImages" => Limits.max_images(),
        "maxSpaces" => max_spaces()
      },
      "images" => images
    }

    input_path = Path.join(root, "input.json")
    File.write!(input_path, Jason.encode!(input, pretty: true))

    %{
      root: root,
      input_path: input_path,
      ambientes_path: Path.join(root, "ambientes.json"),
      catalog_count: length(sources),
      images_written: images_written_count(images),
      listing_data: listing_data,
      listing_facts: listing_facts,
      analysis_id: analysis.id
    }
  end

  def write_ambientes_snapshot!(bundle, ambientes_section) when is_map(bundle) do
    path = Map.get(bundle, :ambientes_path)

    if is_binary(path) do
      File.write!(path, Jason.encode!(ambientes_section, pretty: true))
    end

    bundle
  end

  def cleanup(%{root: root}) when is_binary(root), do: File.rm_rf(root)
  def cleanup(_), do: :ok

  defp write_images!(root, listing_id, sources) do
    Enum.map(sources, fn {index, source} ->
      case read_image(listing_id, source) do
        {:ok, body, content_type} ->
          ext = extension(content_type)
          file_name = "#{index}#{ext}"
          path = Path.join([root, "images", file_name])
          File.write!(path, body)

          %{
            "index" => index,
            "path" => path,
            "contentType" => content_type
          }

        {:error, reason} ->
          %{
            "index" => index,
            "error" => to_string(reason)
          }
      end
    end)
  end

  defp images_written_count(images) do
    Enum.count(images, fn meta -> is_binary(Map.get(meta, "path")) end)
  end

  defp read_image(listing_id, {:storage, index}) do
    ListingImages.serve_image(listing_id, index)
  end

  defp read_image(_listing_id, {:url, url}) do
    case Req.get(url, receive_timeout: 30_000, max_redirects: 3) do
      {:ok, %{status: status, body: body, headers: headers}}
      when status in 200..299 and is_binary(body) ->
        {:ok, body, content_type(headers)}

      _ ->
        {:error, :download_failed}
    end
  rescue
    _ -> {:error, :download_failed}
  end

  defp content_type(headers) do
    Enum.find_value(headers, "image/jpeg", fn
      {"content-type", value} -> value |> String.split(";") |> List.first()
      _ -> nil
    end)
  end

  defp extension("image/png"), do: ".png"
  defp extension("image/webp"), do: ".webp"
  defp extension(_), do: ".jpg"

  defp max_spaces do
    Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])
    |> Keyword.get(:property_analysis_max_spaces, 10)
  end

  defp scrub_map(map) when is_map(map) do
    Map.drop(map, [
      "apiKey",
      "api_key",
      "token",
      "secret",
      "authorization",
      "password",
      "accessToken",
      "refreshToken"
    ])
  end

  defp scrub_map(value), do: value
end
