defmodule MinhaCasaAi.Channel.Inbound do
  @moduledoc """
  Normalizes channel inbound maps (text, etc.).
  """

  def text(%{text: text}) when is_binary(text), do: String.trim(text)

  def text(%{message: %{"text" => %{"body" => body}}}) when is_binary(body), do: String.trim(body)

  def text(%{message: %{"text" => body}}) when is_binary(body), do: String.trim(body)

  def text(_), do: nil
end
