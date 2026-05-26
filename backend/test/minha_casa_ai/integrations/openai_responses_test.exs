defmodule MinhaCasaAi.Integrations.OpenAIResponsesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.OpenAIResponses

  @fixture %{
    "output_text" => "{\"ok\":true}",
    "output" => [
      %{
        "type" => "message",
        "content" => [%{"type" => "output_text", "text" => "{\"ok\":true}"}]
      }
    ]
  }

  test "extract_output_text prefers top-level output_text" do
    assert {:ok, "{\"ok\":true}"} = OpenAIResponses.extract_output_text(@fixture)
  end

  test "extract_output_text falls back to message items" do
    resp = Map.delete(@fixture, "output_text")
    assert {:ok, "{\"ok\":true}"} = OpenAIResponses.extract_output_text(resp)
  end

  test "extract_function_call finds function_call item" do
    resp = %{
      "output" => [
        %{
          "type" => "function_call",
          "call_id" => "call_1",
          "name" => "list_collections",
          "arguments" => "{}"
        }
      ]
    }

    assert {:ok, %{"name" => "list_collections"}} =
             OpenAIResponses.extract_function_call(resp)
  end

  test "extract_function_call returns :none when missing" do
    assert :none = OpenAIResponses.extract_function_call(%{"output" => []})
  end
end
