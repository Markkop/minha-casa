defmodule MinhaCasaAi.Assistant.PendingChoices do
  @moduledoc """
  Parses user replies for pending assistant flows.
  """

  @save ~w(salvar save sim) ++ ["salvar mesmo assim", "save anyway"]
  @merge ~w(mesclar merge)
  @skip ~w(ignorar ignore skip) ++ ["nao", "não"]
  @view ~w(ver site link) ++ ["ver no site", "ver existente", "view existing"]
  @cancel ~w(cancelar cancel sair)

  def duplicate_action(text) when is_binary(text) do
    normalized = normalize(text)

    cond do
      normalized in @cancel -> :cancel
      normalized in @save -> :save
      normalized in @merge -> :merge
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
  defp match_digit("2"), do: :merge
  defp match_digit("3"), do: :skip
  defp match_digit("4"), do: :view
  defp match_digit(_), do: nil
end
