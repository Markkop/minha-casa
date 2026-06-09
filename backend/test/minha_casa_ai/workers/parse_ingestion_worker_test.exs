defmodule MinhaCasaAi.Workers.ParseIngestionWorkerTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Workers.ParseIngestionWorker

  test "duplicate keyboard includes save, merge, ignore, and view actions" do
    markup =
      ParseIngestionWorker.duplicate_keyboard(%{
        duplicates: [
          %{
            candidates: [
              %{listingId: "550e8400-e29b-41d4-a716-446655440000"}
            ]
          }
        ],
        collection: %{id: "550e8400-e29b-41d4-a716-446655440001"}
      })

    buttons = List.flatten(markup.inline_keyboard)

    assert %{text: "Salvar mesmo assim", callback_data: "dup:save:0"} in buttons
    assert %{text: "Mesclar", callback_data: "dup:merge:0"} in buttons
    assert %{text: "Ignorar", callback_data: "dup:skip:0"} in buttons
    assert Enum.any?(buttons, &(&1.text == "Ver anúncio existente"))
  end

  test "view action falls back to duplicate callback without a listing id" do
    markup =
      ParseIngestionWorker.duplicate_keyboard(%{
        duplicates: [%{candidates: [%{}]}],
        collection: %{id: "550e8400-e29b-41d4-a716-446655440001"}
      })

    assert %{text: "Ver anúncio existente", callback_data: "dup:view:0"} in List.flatten(
             markup.inline_keyboard
           )
  end
end
