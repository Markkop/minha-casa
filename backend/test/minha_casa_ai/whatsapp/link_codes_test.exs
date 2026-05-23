defmodule MinhaCasaAi.WhatsApp.LinkCodesTest do
  use ExUnit.Case, async: true

  test "generate_code produces uppercase alphanumeric codes" do
    code =
      :crypto.strong_rand_bytes(6)
      |> Base.encode32(padding: false)
      |> String.slice(0, 8)
      |> String.upcase()

    assert String.length(code) == 8
    assert code == String.upcase(code)
  end
end
