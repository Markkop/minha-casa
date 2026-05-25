defmodule MinhaCasaAi.Integrations.BraveSearch do
  @moduledoc false

  alias MinhaCasaAi.Config

  @search_url "https://api.search.brave.com/res/v1/web/search"

  def search(query) when is_binary(query) do
    trimmed = String.trim(query)

    if trimmed == "" do
      []
    else
      case Config.brave_search_api_key() do
        key when is_binary(key) and key != "" -> do_search(key, trimmed)
        _ -> []
      end
    end
  end

  defp do_search(api_key, query) do
    params = %{
      q: query,
      count: "5",
      country: "BR",
      search_lang: "pt-br",
      extra_snippets: "true"
    }

    case Req.get(@search_url,
           params: params,
           headers: [
             {"accept", "application/json"},
             {"x-subscription-token", api_key}
           ],
           finch: MinhaCasaAi.Finch,
           receive_timeout: 15_000
         ) do
      {:ok, %{status: status, body: body}} when status in 200..299 ->
        parse_results(body)

      _ ->
        []
    end
  rescue
    _ -> []
  end

  defp parse_results(body) when is_binary(body) do
    with {:ok, %{"web" => %{"results" => results}}} <- Jason.decode(body),
         true <- is_list(results) do
      results
      |> Enum.take(5)
      |> Enum.map(fn row ->
        %{
          title: to_string(Map.get(row, "title", "")),
          url: to_string(Map.get(row, "url", "")),
          description: optional_string(Map.get(row, "description")),
          extra_snippets:
            case Map.get(row, "extra_snippets") do
              list when is_list(list) -> Enum.map(list, &to_string/1) |> Enum.take(3)
              _ -> []
            end
        }
      end)
    else
      _ -> []
    end
  end

  defp parse_results(_), do: []

  defp optional_string(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: nil, else: trimmed
  end

  defp optional_string(_), do: nil
end
