defmodule MinhaCasaAi.Channel.ContentDetectorTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Channel.ContentDetector

  test "extracts url from text message" do
    inbound = %{
      type: "text",
      message: %{"text" => %{"body" => "Veja https://example.com/imovel/1"}}
    }

    assert {:ok, %{"kind" => "url", "url" => "https://example.com/imovel/1"}} =
             ContentDetector.from_whatsapp_message(inbound)
  end

  test "falls back to plain text" do
    inbound = %{
      type: "text",
      message: %{"text" => %{"body" => "Apartamento 3 quartos no centro"}}
    }

    assert {:ok, %{"kind" => "text", "rawText" => body}} =
             ContentDetector.from_whatsapp_message(inbound)

    assert body =~ "Apartamento"
  end
end
