defmodule MinhaCasaAi.Integrations.LangfuseTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.Langfuse.{PromptDefinitions, Prompts, Trace}

  test "compile_template substitutes variables" do
    assert Prompts.compile_template("Hello {{name}}", %{"name" => "Minha Casa"}) ==
             "Hello Minha Casa"
  end

  test "fallback compile uses prompt definitions" do
    assert {:ok, text, %{name: "hermes/global-instructions"}} =
             Prompts.compile("hermes/global-instructions", %{})

    assert text =~ "JSON válido"
  end

  test "prompt definitions include all hermes steps" do
    names = PromptDefinitions.all() |> Enum.map(& &1["name"]) |> MapSet.new()

    for step <- [
          "hermes/step/clima",
          "hermes/step/riscos",
          "hermes/step/mercado",
          "hermes/step/ambientes",
          "hermes/step/idade",
          "hermes/step/xray-card",
          "listing-parser/system",
          "assistant/instructions"
        ] do
      assert MapSet.member?(names, step)
    end
  end

  test "trace unique ids are hex strings" do
    id = Trace.unique_id()
    assert is_binary(id)
    assert byte_size(id) == 32
  end
end
