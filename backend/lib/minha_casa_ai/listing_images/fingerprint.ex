defmodule MinhaCasaAi.ListingImages.Fingerprint do
  @moduledoc false

  @hash_bits 64
  @max_hamming_distance 9
  @max_aspect_delta 0.05

  def from_bytes(bytes) when is_binary(bytes) do
    with {:ok, image} <- Image.from_binary(bytes),
         {:ok, hash} <- Image.dhash(image, @hash_bits) do
      {:ok,
       %{
         "sha256" => Base.encode16(:crypto.hash(:sha256, bytes), case: :lower),
         "dhash" => Base.encode64(hash),
         "width" => Image.width(image),
         "height" => Image.height(image)
       }}
    end
  rescue
    _ -> {:error, :invalid_image}
  end

  def duplicate?(left, right) when is_map(left) and is_map(right) do
    same_sha?(left, right) or perceptually_close?(left, right)
  end

  def duplicate?(_, _), do: false

  defp same_sha?(left, right) do
    present(left["sha256"]) and left["sha256"] == right["sha256"]
  end

  defp perceptually_close?(left, right) do
    with {:ok, left_hash} <- decode_hash(left["dhash"]),
         {:ok, right_hash} <- decode_hash(right["dhash"]),
         true <- similar_aspect?(left, right),
         {:ok, distance} <- Image.hamming_distance(left_hash, right_hash) do
      distance <= @max_hamming_distance
    else
      _ -> false
    end
  end

  defp similar_aspect?(left, right) do
    with width1 when is_number(width1) and width1 > 0 <- left["width"],
         height1 when is_number(height1) and height1 > 0 <- left["height"],
         width2 when is_number(width2) and width2 > 0 <- right["width"],
         height2 when is_number(height2) and height2 > 0 <- right["height"] do
      ratio1 = width1 / height1
      ratio2 = width2 / height2
      abs(ratio1 - ratio2) / max(ratio1, ratio2) <= @max_aspect_delta
    else
      _ -> false
    end
  end

  defp decode_hash(value) when is_binary(value), do: Base.decode64(value)
  defp decode_hash(_), do: :error

  defp present(value), do: is_binary(value) and value != ""
end
