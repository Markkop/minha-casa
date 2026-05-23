defmodule MinhaCasaAi.Channel.ContentDetectorTelegramTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Channel.ContentDetector

  test "extracts url from telegram text message" do
    inbound = %{
      type: "text",
      message: %{"text" => "Olha https://example.com/imovel/2"}
    }

    assert {:ok, %{"kind" => "url", "url" => "https://example.com/imovel/2"}} =
             ContentDetector.from_telegram_message(inbound)
  end
end
