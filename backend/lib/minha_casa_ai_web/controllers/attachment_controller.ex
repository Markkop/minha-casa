defmodule MinhaCasaAiWeb.AttachmentController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Attachments
  alias MinhaCasaAi.Attachments.Attachment

  def create(conn, params) do
    attrs =
      params
      |> Map.put(:user_id, conn.assigns[:current_user_id])
      |> Map.put(:org_id, conn.assigns[:current_org_id])

    case Attachments.create_from_base64(attrs) do
      {:ok, %Attachment{} = attachment} ->
        conn
        |> put_status(:created)
        |> json(%{attachment: attachment_json(attachment)})

      {:error, reason} ->
        {status, message} = map_error(reason)
        conn |> put_status(status) |> json(%{error: message})
    end
  end

  defp attachment_json(attachment) do
    %{
      id: attachment.id,
      storageKey: attachment.storage_key,
      filename: attachment.filename,
      contentType: attachment.content_type,
      byteSize: attachment.byte_size,
      source: attachment.source
    }
  end

  defp map_error(:minio_not_configured),
    do: {:service_unavailable, "MinIO storage is not configured"}

  defp map_error(:invalid_base64), do: {:bad_request, "Dados do arquivo inválidos"}
  defp map_error(:empty_file), do: {:bad_request, "Arquivo vazio"}
  defp map_error(:file_too_large), do: {:bad_request, "Arquivo muito grande"}
  defp map_error(:missing_content_type), do: {:bad_request, "Content type is required"}

  defp map_error({:minio_upload_failed, _reason}),
    do: {:bad_gateway, "Falha ao enviar arquivo para o storage"}

  defp map_error(%Ecto.Changeset{}), do: {:unprocessable_entity, "Attachment inválido"}
  defp map_error(reason), do: {:internal_server_error, "Attachment failed: #{inspect(reason)}"}
end
