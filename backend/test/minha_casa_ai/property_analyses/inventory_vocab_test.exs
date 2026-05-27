defmodule MinhaCasaAi.PropertyAnalyses.InventoryVocabTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PropertyAnalyses.InventoryVocab

  test "prompt_block includes vocabulary sections and color prohibition" do
    block = InventoryVocab.prompt_block()

    assert String.contains?(block, "piso")
    assert String.contains?(block, "porcelanato")
    assert String.contains?(block, "Instalações")
    assert String.contains?(block, "NUNCA inclua cor")
  end

  test "lists are non-empty" do
    assert length(InventoryVocab.estruturais()) > 0
    assert length(InventoryVocab.instalacoes()) > 0
    assert length(InventoryVocab.moveis()) > 0
    assert length(InventoryVocab.materiais()) > 0
  end
end
