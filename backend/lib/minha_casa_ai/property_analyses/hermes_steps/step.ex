defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Step do
  @moduledoc """
  Shared helpers for Hermes pipeline step modules.
  """

  alias MinhaCasaAi.PropertyAnalyses.ListingFacts

  @pt_rules """
  Regras gerais:
  - Todo texto visível ao usuário em português do Brasil.
  - Responda SOMENTE JSON válido, sem Markdown.
  - Se não puder concluir, retorne skipped=true e reason explicando.
  - Não inclua segredos, tokens ou URLs internas autenticadas.
  """

  def pt_rules, do: @pt_rules

  def location_context(bundle, address) do
    facts = Map.get(bundle, :listing_facts) || %{}
    data = Map.get(bundle, :listing_data) || %{}

    %{
      "cidade" => pick(address, facts, data, "cidade"),
      "bairro" => pick(address, facts, data, "bairro"),
      "formattedAddress" => Map.get(address || %{}, "formattedAddress"),
      "lat" => Map.get(address || %{}, "lat"),
      "lng" => Map.get(address || %{}, "lng")
    }
    |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" end)
    |> Map.new()
  end

  def facts_text(bundle) do
    bundle
    |> Map.get(:listing_facts, %{})
    |> ListingFacts.hints_text()
  end

  def read_input_json(bundle) do
    path = Map.get(bundle, :input_path)

    if is_binary(path) and File.exists?(path) do
      path |> File.read!() |> Jason.decode!()
    else
      %{}
    end
  end

  def skipped(reason) when is_binary(reason) do
    %{"skipped" => true, "reason" => reason}
  end

  def string_or_nil(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: nil, else: trimmed
  end

  def string_or_nil(_), do: nil

  def ensure_string(value, default \\ "") when is_binary(default) do
    case string_or_nil(value) do
      nil -> default
      s -> s
    end
  end

  def ensure_list(value) when is_list(value), do: value
  def ensure_list(_), do: []

  def ensure_map(value) when is_map(value), do: value
  def ensure_map(_), do: %{}

  def int_or_nil(value) when is_integer(value), do: value

  def int_or_nil(value) when is_float(value), do: trunc(value)

  def int_or_nil(value) when is_binary(value) do
    case Integer.parse(String.trim(value)) do
      {n, _} -> n
      _ -> nil
    end
  end

  def int_or_nil(_), do: nil

  def float_or_nil(value) when is_number(value), do: value * 1.0

  def float_or_nil(value) when is_binary(value) do
    case Float.parse(String.trim(value)) do
      {n, _} -> n
      _ -> nil
    end
  end

  def float_or_nil(_), do: nil

  defp pick(address, facts, data, key) do
    Map.get(address || %{}, key) ||
      Map.get(facts, key) ||
      Map.get(data, key)
  end
end
