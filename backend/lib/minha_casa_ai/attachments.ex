defmodule MinhaCasaAi.Attachments do
  alias MinhaCasaAi.Attachments.{Attachment, Storage}
  alias MinhaCasaAi.Repo

  @max_bytes 10 * 1024 * 1024

  def create_from_base64(attrs) do
    with {:ok, bytes} <- decode(attrs["base64"] || attrs[:base64]),
         :ok <- validate_size(bytes),
         content_type when is_binary(content_type) <-
           attrs["contentType"] || attrs[:content_type],
         filename <- attrs["filename"] || attrs[:filename] || "attachment",
         source <- attrs["source"] || attrs[:source] || "web",
         key <- storage_key(filename),
         {:ok, _key} <- Storage.put_object(key, bytes, content_type) do
      %Attachment{}
      |> Attachment.changeset(%{
        user_id: attrs[:user_id],
        org_id: attrs[:org_id],
        storage_key: key,
        filename: filename,
        content_type: content_type,
        byte_size: byte_size(bytes),
        source: source,
        metadata: attrs["metadata"] || attrs[:metadata] || %{}
      })
      |> Repo.insert()
    else
      nil -> {:error, :missing_content_type}
      error -> error
    end
  end

  defp decode(base64) when is_binary(base64) do
    base64
    |> String.replace(~r/^data:[^;]+;base64,/, "")
    |> String.trim()
    |> Base.decode64()
    |> case do
      {:ok, bytes} when byte_size(bytes) > 0 -> {:ok, bytes}
      {:ok, _} -> {:error, :empty_file}
      :error -> {:error, :invalid_base64}
    end
  end

  defp decode(_), do: {:error, :invalid_base64}

  defp validate_size(bytes) do
    if byte_size(bytes) <= @max_bytes, do: :ok, else: {:error, :file_too_large}
  end

  defp storage_key(filename) do
    safe_name = filename |> Path.basename() |> String.replace(~r/[^a-zA-Z0-9._-]/, "-")
    "attachments/#{Date.utc_today()}/#{Ecto.UUID.generate()}-#{safe_name}"
  end
end
