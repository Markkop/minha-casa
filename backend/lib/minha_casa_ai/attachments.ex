defmodule MinhaCasaAi.Attachments do
  import Ecto.Query

  alias MinhaCasaAi.Attachments.{Attachment, Storage}
  alias MinhaCasaAi.Repo

  @max_bytes 10 * 1024 * 1024

  def create_from_base64(attrs) do
    with {:ok, bytes} <- decode(attrs["base64"] || attrs[:base64]),
         :ok <- validate_size(bytes) do
      create_from_bytes(bytes, attrs)
    end
  end

  def create_from_bytes(bytes, attrs) when is_binary(bytes) and is_map(attrs) do
    workspace_id =
      attrs["workspaceId"] || attrs["workspace_id"] || attrs[:workspace_id]

    content_type = attrs["contentType"] || attrs["content_type"] || attrs[:content_type]

    with :ok <- validate_size(bytes),
         :ok <- validate_workspace(workspace_id),
         :ok <- validate_content_type(content_type) do
      filename = attrs["filename"] || attrs[:filename] || "attachment"
      source = attrs["source"] || attrs[:source] || "web"
      key = storage_key(workspace_id, filename)

      with {:ok, _key} <- Storage.put_object(key, bytes, content_type) do
        result =
          %Attachment{}
          |> Attachment.changeset(%{
            user_id: attrs["user_id"] || attrs[:user_id],
            org_id: attrs["org_id"] || attrs[:org_id],
            workspace_id: workspace_id,
            storage_key: key,
            filename: filename,
            content_type: content_type,
            byte_size: byte_size(bytes),
            source: source,
            metadata: attrs["metadata"] || attrs[:metadata] || %{}
          })
          |> Repo.insert()

        if match?({:error, _}, result), do: Storage.delete_object(key)
        result
      end
    end
  end

  def get(id, workspace_id) when is_binary(id) and is_binary(workspace_id) do
    Repo.one(from(a in Attachment, where: a.id == ^id and a.workspace_id == ^workspace_id))
  end

  def get(_, _), do: nil

  def fetch(id, workspace_id) do
    case get(id, workspace_id) do
      %Attachment{} = attachment ->
        case Storage.get_object(attachment.storage_key) do
          {:ok, bytes} -> {:ok, attachment, bytes}
          error -> error
        end

      nil ->
        {:error, :attachment_not_found}
    end
  end

  def fetch_base64(id, workspace_id) do
    with {:ok, attachment, bytes} <- fetch(id, workspace_id) do
      {:ok, attachment, Base.encode64(bytes)}
    end
  end

  def delete(id, workspace_id) do
    case get(id, workspace_id) do
      %Attachment{} = attachment ->
        with :ok <- Storage.delete_object(attachment.storage_key),
             {:ok, _} <- Repo.delete(attachment) do
          :ok
        end

      nil ->
        :ok
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

  defp validate_workspace(value) when is_binary(value) and value != "", do: :ok
  defp validate_workspace(_), do: {:error, :missing_workspace}

  defp validate_content_type(value) when is_binary(value) and value != "", do: :ok
  defp validate_content_type(_), do: {:error, :missing_content_type}

  defp storage_key(workspace_id, filename) do
    safe_name = filename |> Path.basename() |> String.replace(~r/[^a-zA-Z0-9._-]/, "-")
    "attachments/#{workspace_id}/#{Date.utc_today()}/#{Ecto.UUID.generate()}-#{safe_name}"
  end
end
