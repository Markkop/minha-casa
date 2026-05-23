defmodule MinhaCasaAi.ListingShortLinks do
  @moduledoc """
  Short `/s/{id}` links for listings (channel messages and redirects).
  """

  import Ecto.Query

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Ingestion.Complete
  alias MinhaCasaAi.Listings.ListingShortLink
  alias MinhaCasaAi.Repo

  @short_id_length 6
  @alphabet ~c"abcdefghijklmnopqrstuvwxyz0123456789"

  def ensure_short_id(collection_id, listing_id)
      when is_binary(collection_id) and is_binary(listing_id) do
    case Repo.get_by(ListingShortLink, listing_id: listing_id) do
      %ListingShortLink{short_id: short_id} ->
        {:ok, short_id}

      nil ->
        insert_short_link(collection_id, listing_id)
    end
  end

  def short_url(collection_id, listing_id)
      when is_binary(collection_id) and is_binary(listing_id) do
    base = Config.app_public_url() |> normalize_base()

    cond do
      base == "" ->
        Complete.app_listing_url(collection_id, listing_id)

      true ->
        case ensure_short_id(collection_id, listing_id) do
          {:ok, short_id} -> "#{base}/s/#{short_id}"
          {:error, _} -> Complete.app_listing_url(collection_id, listing_id)
        end
    end
  end

  defp insert_short_link(collection_id, listing_id, attempts \\ 5) do
    short_id = generate_short_id()

    %ListingShortLink{}
    |> ListingShortLink.changeset(%{
      short_id: short_id,
      listing_id: listing_id,
      collection_id: collection_id
    })
    |> Repo.insert()
    |> case do
      {:ok, %ListingShortLink{short_id: short_id}} ->
        {:ok, short_id}

      {:error, %Ecto.Changeset{errors: errors}} ->
        if duplicate_short_id?(errors) and attempts > 0 do
          insert_short_link(collection_id, listing_id, attempts - 1)
        else
          {:error, :insert_failed}
        end
    end
  end

  defp duplicate_short_id?(errors) do
    Enum.any?(errors, fn
      {:short_id, {_, [constraint: :unique, constraint_name: _]}} -> true
      _ -> false
    end)
  end

  defp generate_short_id do
    :crypto.strong_rand_bytes(@short_id_length)
    |> :binary.bin_to_list()
    |> Enum.map(fn byte ->
      idx = rem(byte, length(@alphabet))
      <<Enum.at(@alphabet, idx)>>
    end)
    |> IO.iodata_to_binary()
  end

  defp normalize_base(nil), do: ""
  defp normalize_base(base), do: base |> String.trim_trailing("/")
end
