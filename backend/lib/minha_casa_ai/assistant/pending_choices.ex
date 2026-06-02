defmodule MinhaCasaAi.Assistant.PendingChoices do
  @moduledoc """
  Parses user replies for pending assistant flows.
  """

  @save ~w(1 salvar save sim) ++ ["salvar mesmo assim"]
  @skip ~w(2 ignorar ignore skip) ++ ["nao", "não"]
  @view ~w(3 ver site link) ++ ["ver no site"]
  @cancel ~w(cancelar cancel sair)

  def duplicate_action(text) when is_binary(text) do
    normalized = normalize(text)

    cond do
      normalized in @cancel -> :cancel
      normalized in @save -> :save
      normalized in @skip -> :skip
      normalized in @view -> :view
      match_digit(normalized) -> match_digit(normalized)
      true -> nil
    end
  end

  def duplicate_action(_), do: nil

  def cancelled?(text), do: duplicate_action(text) == :cancel

  defp normalize(text) do
    text
    |> String.trim()
    |> String.downcase()
    |> String.replace(~r/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/u, "")
  end

  defp match_digit("1"), do: :save
  defp match_digit("2"), do: :skip
  defp match_digit("3"), do: :view
  defp match_digit(_), do: nil
end
