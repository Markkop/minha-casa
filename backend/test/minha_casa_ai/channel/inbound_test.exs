defmodule MinhaCasaAi.Channel.InboundTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Channel.Inbound

  test "text/1 reads top-level text or WhatsApp message body" do
    assert Inbound.text(%{text: "oi"}) == "oi"

    assert Inbound.text(%{
             message: %{"type" => "text", "text" => %{"body" => "ignorar"}}
           }) == "ignorar"

    assert Inbound.text(%{message: %{}}) == nil
  end
end
