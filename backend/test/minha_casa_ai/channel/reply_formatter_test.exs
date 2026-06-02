defmodule MinhaCasaAi.Channel.ReplyFormatterTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Channel.ReplyFormatter

  @listing_id "550e8400-e29b-41d4-a716-446655440000"
  @collection_id "550e8400-e29b-41d4-a716-446655440001"

  @full_data %{
    "tipoImovel" => "casa",
    "starred" => true,
    "m2Privado" => 320,
    "m2Totais" => 400,
    "preco" => 2_100_000,
    "quartos" => 4,
    "banheiros" => 3,
    "garagem" => 2,
    "piscina" => true,
    "academia" => true,
    "endereco" => "Rua das Palmeiras, 45",
    "bairro" => "Jardim América",
    "cidade" => "São Paulo"
  }

  test "format_listing_card renders header, metrics, address without url when no ids" do
    card = ReplyFormatter.format_listing_card(@full_data)

    assert card =~ "★ Casa"
    assert card =~ "320 m²"
    assert card =~ "R$ 2.100.000"
    assert card =~ "R$ 6.562/m²"
    assert card =~ "📐 320/400 m²"
    assert card =~ "🛏️ 4"
    assert card =~ "🚿 3"
    assert card =~ "🚗 2"
    assert card =~ "🏊"
    assert card =~ "🏋️"
    assert card =~ "Rua das Palmeiras, 45 — Jardim América, São Paulo"
    refute card =~ "https://"
  end

  test "format_listing_card omits empty segments" do
    card =
      ReplyFormatter.format_listing_card(%{
        "tipoImovel" => "apartamento",
        "preco" => 420_000,
        "quartos" => 1,
        "banheiros" => 1,
        "cidade" => "Curitiba"
      })

    assert card =~ "Apto"
    assert card =~ "R$ 420.000"
    assert card =~ "🛏️ 1"
    refute card =~ "🚗"
    refute card =~ "🏊"
    refute card =~ "📐"
  end

  test "ingestion_result for saved listings uses card format" do
    text =
      ReplyFormatter.ingestion_result(%{
        saved: [
          %{
            listing_id: @listing_id,
            collection_id: @collection_id,
            title: "Casa teste",
            listing_data: Map.put(@full_data, "starred", false)
          }
        ],
        collection: %{name: "Meus Imóveis 2026"},
        pending_type: nil
      })

    assert text =~ "Salvei 1"
    assert text =~ "Meus Imóveis 2026"
    assert text =~ "Casa"
    assert text =~ "Rua das Palmeiras"
    refute text =~ "• Casa teste"
  end

  test "workflow_summary uses card format" do
    text = ReplyFormatter.workflow_summary(%{"listings" => [@full_data]})

    assert text =~ "Encontrei 1"
    assert text =~ "★ Casa"
    assert text =~ "Rua das Palmeiras"
  end

  test "list_listings uses card format" do
    listing = %{
      id: @listing_id,
      collection_id: @collection_id,
      data: Map.put(@full_data, "starred", false)
    }

    text = ReplyFormatter.list_listings([listing], "Minha coleção")

    assert text =~ "Imóveis em \"Minha coleção\""
    assert text =~ "Casa"
    assert text =~ "Rua das Palmeiras"
    refute text =~ "•"
  end

  test "help_text lists commands" do
    assert ReplyFormatter.help_text() =~ "ajuda"
    assert ReplyFormatter.help_text() =~ "favoritos"
  end
end
