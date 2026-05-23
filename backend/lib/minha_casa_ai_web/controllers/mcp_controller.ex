defmodule MinhaCasaAiWeb.McpController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Integrations.ListingParser

  def handle(conn, %{"method" => "initialize", "id" => id}) do
    json(conn, %{
      jsonrpc: "2.0",
      id: id,
      result: %{
        protocolVersion: "2025-03-26",
        serverInfo: %{name: "minha-casa-ai", version: "0.1.0"},
        capabilities: %{tools: %{}}
      }
    })
  end

  def handle(conn, %{"method" => "tools/list", "id" => id}) do
    json(conn, %{
      jsonrpc: "2.0",
      id: id,
      result: %{
        tools: [
          %{
            name: "extract_listing",
            description: "Extract real estate listing data from text or URL.",
            inputSchema: %{
              type: "object",
              properties: %{
                kind: %{type: "string", enum: ["text", "url"]},
                rawText: %{type: "string"},
                url: %{type: "string"}
              },
              required: ["kind"]
            }
          }
        ]
      }
    })
  end

  def handle(conn, %{
        "method" => "tools/call",
        "id" => id,
        "params" => %{"name" => "extract_listing", "arguments" => args}
      }) do
    input =
      case args do
        %{"kind" => "url", "url" => url} -> %{"kind" => "url", "url" => url}
        %{"rawText" => raw_text} -> %{"kind" => "text", "rawText" => raw_text}
        %{"kind" => "text", "rawText" => raw_text} -> %{"kind" => "text", "rawText" => raw_text}
        _ -> %{}
      end

    result =
      case ListingParser.parse(input) do
        {:ok, listings} ->
          %{content: [%{type: "text", text: Jason.encode!(%{listings: listings})}]}

        {:error, reason} ->
          %{isError: true, content: [%{type: "text", text: "Erro: #{reason}"}]}
      end

    json(conn, %{jsonrpc: "2.0", id: id, result: result})
  end

  def handle(conn, %{"id" => id}) do
    json(conn, %{jsonrpc: "2.0", id: id, error: %{code: -32601, message: "Method not found"}})
  end
end
