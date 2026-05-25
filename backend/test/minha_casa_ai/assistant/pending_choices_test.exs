defmodule MinhaCasaAi.Assistant.PendingChoicesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Assistant.PendingChoices

  test "duplicate_action accepts digits and Portuguese labels" do
    assert PendingChoices.duplicate_action("2") == :skip
    assert PendingChoices.duplicate_action("ignorar") == :skip
    assert PendingChoices.duplicate_action("1") == :save
    assert PendingChoices.duplicate_action("salvar") == :save
    assert PendingChoices.duplicate_action("3") == :view
    assert PendingChoices.duplicate_action("ver no site") == :view
    assert PendingChoices.duplicate_action("cancelar") == :cancel
    assert PendingChoices.duplicate_action("cancel") == :cancel
    assert PendingChoices.duplicate_action("maybe") == nil
  end
end
