defmodule MinhaCasaAi.ListingImages.References do
  @moduledoc false

  alias MinhaCasaAi.Repo

  def unreferenced_targets(keys, prefixes) when is_list(keys) and is_list(prefixes) do
    keys = normalize(keys)
    prefixes = normalize(prefixes)
    referenced = referenced_keys(keys, prefixes)

    %{
      keys: Enum.reject(keys, &MapSet.member?(referenced, &1)),
      prefixes:
        Enum.reject(prefixes, fn prefix ->
          Enum.any?(referenced, &String.starts_with?(&1, prefix))
        end)
    }
  end

  defp referenced_keys([], []), do: MapSet.new()

  defp referenced_keys(keys, prefixes) do
    result =
      Repo.query!(
        """
        WITH image_keys AS (
          SELECT image_key.value AS value
          FROM listings AS listing
          CROSS JOIN LATERAL jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(listing.data->'imageStorageKeys') = 'array'
                THEN listing.data->'imageStorageKeys'
              ELSE '[]'::jsonb
            END
          ) AS image_key(value)
        )
        SELECT DISTINCT image_keys.value
        FROM image_keys
        WHERE image_keys.value = ANY($1::text[])
           OR EXISTS (
             SELECT 1
             FROM unnest($2::text[]) AS candidate(prefix)
             WHERE left(image_keys.value, length(candidate.prefix)) = candidate.prefix
           )
        """,
        [keys, prefixes]
      )

    result.rows
    |> Enum.map(&List.first/1)
    |> MapSet.new()
  end

  defp normalize(values) do
    values
    |> Enum.filter(&is_binary/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
  end
end
