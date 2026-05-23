defmodule MinhaCasaAi.Channel.ReplyFormatterTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Channel.ReplyFormatter

  test "ingestion_result for saved listings" do
    text =
      ReplyFormatter.ingestion_result(%{
        saved: [
          %{
            title: "Casa teste",
            url: "https://app.example/anuncios?collection=c1&listing=l1"
          }
        ],
        collection: %{name: "Meus Imóveis 2026"},
        pending_type: nil
      })

    assert text =~ "Salvei 1"
    assert text =~ "Meus Imóveis 2026"
    assert text =~ "Casa teste"
  end

  test "help_text lists commands" do
    assert ReplyFormatter.help_text() =~ "ajuda"
    assert ReplyFormatter.help_text() =~ "favoritos"
  end
end
