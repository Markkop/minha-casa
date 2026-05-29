defmodule MinhaCasaAi.PortalSearches.PromptTemplates do
  @moduledoc false

  alias MinhaCasaAi.Integrations.Langfuse.Prompts

  def results_extractor(portal, source_url, page_text, opts \\ []) do
    listing_urls = Keyword.get(opts, :listing_urls, [])

    vars = %{
      "portal" => portal,
      "source_url" => source_url,
      "page_text" => page_text,
      "listing_urls" => format_listing_urls(listing_urls)
    }

    compile("portal_search/results_extractor", vars)
  end

  defp format_listing_urls([]), do: "(nenhum link de anúncio encontrado no HTML)"

  defp format_listing_urls(urls) when is_list(urls) do
    urls
    |> Enum.with_index(1)
    |> Enum.map(fn {url, i} -> "#{i}. #{url}" end)
    |> Enum.join("\n")
  end

  defp compile(name, vars) do
    case Prompts.compile(name, vars) do
      {:ok, text, ref} -> {text, ref}
      {:error, _} -> fallback_compile(name, vars)
    end
  end

  defp fallback_compile(name, vars) do
    alias MinhaCasaAi.Integrations.Langfuse.PromptDefinitions

    case PromptDefinitions.get(name) do
      %{"prompt" => template} ->
        text = Prompts.compile_template(template, stringify_vars(vars))
        {text, %{name: name, version: 0}}

      _ ->
        {"", %{name: name, version: 0}}
    end
  end

  defp stringify_vars(vars) do
    Map.new(vars, fn {k, v} -> {to_string(k), if(is_binary(v), do: v, else: to_string(v))} end)
  end
end
