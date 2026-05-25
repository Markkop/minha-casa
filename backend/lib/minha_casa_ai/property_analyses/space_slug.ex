defmodule MinhaCasaAi.PropertyAnalyses.SpaceSlug do
  @moduledoc false

  @doc """
  Stable ASCII slug for spaceId matching between mapper, risk pipeline and UI.
  """
  def slug(value) when is_binary(value) do
    value
    |> String.downcase()
    |> unaccent()
    |> String.replace(~r/[^a-z0-9]+/, "-")
    |> String.trim("-")
    |> case do
      "" -> "indefinido"
      s -> s
    end
  end

  def slug(value), do: slug(to_string(value))

  defp unaccent(str) do
    str
    |> String.replace("á", "a")
    |> String.replace("à", "a")
    |> String.replace("â", "a")
    |> String.replace("ã", "a")
    |> String.replace("é", "e")
    |> String.replace("ê", "e")
    |> String.replace("í", "i")
    |> String.replace("ó", "o")
    |> String.replace("ô", "o")
    |> String.replace("õ", "o")
    |> String.replace("ú", "u")
    |> String.replace("ü", "u")
    |> String.replace("ç", "c")
  end
end
