defmodule MinhaCasaAi.Attachments.Storage do
  alias MinhaCasaAi.Config

  def put_object(key, bytes, content_type) when is_binary(key) and is_binary(bytes) do
    if Config.configured?(:minio) do
      ExAws.S3.put_object(Config.minio_bucket(), key, bytes, content_type: content_type)
      |> ExAws.request(ex_aws_config())
      |> case do
        {:ok, _} -> {:ok, key}
        {:error, reason} -> {:error, {:minio_upload_failed, reason}}
      end
    else
      {:error, :minio_not_configured}
    end
  end

  def get_object(key) when is_binary(key) do
    if Config.configured?(:minio) do
      ExAws.S3.get_object(Config.minio_bucket(), key)
      |> ExAws.request(ex_aws_config())
      |> case do
        {:ok, %{body: body}} when is_binary(body) ->
          {:ok, body}

        {:ok, %{"Body" => body}} when is_binary(body) ->
          {:ok, body}

        {:error, reason} when is_tuple(reason) ->
          if not_found?(reason),
            do: {:error, :object_not_found},
            else: {:error, {:minio_download_failed, reason}}

        {:error, reason} ->
          {:error, {:minio_download_failed, reason}}
      end
    else
      {:error, :minio_not_configured}
    end
  end

  def delete_object(key) when is_binary(key) do
    if Config.configured?(:minio) do
      ExAws.S3.delete_object(Config.minio_bucket(), key)
      |> ExAws.request(ex_aws_config())
      |> case do
        {:ok, _} ->
          :ok

        {:error, reason} ->
          if not_found?(reason),
            do: :ok,
            else: {:error, {:minio_delete_failed, reason}}
      end
    else
      {:error, :minio_not_configured}
    end
  end

  defp not_found?({:http_error, 404, _}), do: true
  defp not_found?({_, value}) when is_tuple(value), do: not_found?(value)
  defp not_found?(_), do: false

  defp ex_aws_config do
    uri = URI.parse(Config.minio_endpoint())
    scheme = (uri.scheme || "http") <> "://"
    port = uri.port || if(uri.scheme == "https", do: 443, else: 80)

    [
      access_key_id: Config.minio_access_key(),
      secret_access_key: Config.minio_secret_key(),
      region: "us-east-1",
      scheme: scheme,
      host: uri.host,
      port: port,
      s3: [
        scheme: scheme,
        host: uri.host,
        port: port,
        bucket_as_host: false
      ]
    ]
  end
end
