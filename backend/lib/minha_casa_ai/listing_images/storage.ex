defmodule MinhaCasaAi.ListingImages.Storage do
  alias MinhaCasaAi.Config

  @content_type_ext %{
    "image/jpeg" => "jpg",
    "image/jpg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp",
    "image/gif" => "gif"
  }

  def put_listing_image(listing_id, index, bytes, content_type)
      when is_binary(listing_id) and is_integer(index) and index >= 0 and is_binary(bytes) do
    key = listing_image_key(listing_id, index, content_type)
    put_object(key, bytes, content_type)
  end

  def put_versioned_listing_image(listing_id, bytes, content_type)
      when is_binary(listing_id) and is_binary(bytes) and is_binary(content_type) do
    ext = Map.get(@content_type_ext, content_type, "jpg")
    key = "listings/#{listing_id}/gallery/#{Ecto.UUID.generate()}.#{ext}"
    put_object(key, bytes, content_type)
  end

  def put_staged_merge_image(session_id, image_id, bytes, content_type)
      when is_binary(session_id) and is_binary(image_id) and is_binary(bytes) do
    ext = Map.get(@content_type_ext, content_type, "jpg")
    key = "listing-merge-sessions/#{session_id}/#{image_id}.#{ext}"

    case put_object(key, bytes, content_type) do
      {:ok, _} -> {:ok, key}
      error -> error
    end
  end

  def put_object(key, bytes, content_type)
      when is_binary(key) and is_binary(bytes) and is_binary(content_type) do
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

  def delete_object(key) when is_binary(key) do
    if Config.configured?(:minio) do
      ExAws.S3.delete_object(Config.minio_bucket(), key)
      |> ExAws.request(ex_aws_config())
      |> case do
        {:ok, _} -> :ok
        {:error, reason} -> {:error, {:minio_delete_failed, reason}}
      end
    else
      {:error, :minio_not_configured}
    end
  end

  def delete_objects(keys) when is_list(keys) do
    keys = normalize_targets(keys)

    cond do
      keys == [] ->
        :ok

      not Config.configured?(:minio) ->
        {:error, :minio_not_configured}

      true ->
        ExAws.S3.delete_all_objects(Config.minio_bucket(), keys, quiet: true)
        |> ExAws.request(ex_aws_config())
        |> case do
          {:ok, _} -> :ok
          {:error, reason} -> {:error, {:minio_batch_delete_failed, reason}}
        end
    end
  end

  def delete_prefix(prefix) when is_binary(prefix) do
    prefix = String.trim(prefix)

    cond do
      prefix == "" ->
        {:error, :invalid_prefix}

      not Config.configured?(:minio) ->
        {:error, :minio_not_configured}

      true ->
        try do
          keys =
            Config.minio_bucket()
            |> ExAws.S3.list_objects_v2(prefix: prefix)
            |> ExAws.stream!(ex_aws_config())
            |> Stream.map(& &1.key)
            |> Enum.to_list()

          delete_objects(keys)
        rescue
          exception -> {:error, {:minio_prefix_delete_failed, exception}}
        end
    end
  end

  def delete_targets(keys, prefixes) when is_list(keys) and is_list(prefixes) do
    with :ok <- delete_objects(keys) do
      prefixes
      |> normalize_targets()
      |> Enum.reduce_while(:ok, fn prefix, :ok ->
        case delete_prefix(prefix) do
          :ok -> {:cont, :ok}
          {:error, _} = error -> {:halt, error}
        end
      end)
    end
  end

  def get_object(key) when is_binary(key) do
    if Config.configured?(:minio) do
      ExAws.S3.get_object(Config.minio_bucket(), key)
      |> ExAws.request(ex_aws_config())
      |> case do
        {:ok, %{body: body, headers: headers}} ->
          {:ok, body, content_type_from_headers(headers)}

        {:error, reason} ->
          {:error, {:minio_get_failed, reason}}
      end
    else
      {:error, :minio_not_configured}
    end
  end

  def listing_image_key(listing_id, index, content_type) do
    ext = Map.get(@content_type_ext, content_type, "jpg")
    "listings/#{listing_id}/#{index}.#{ext}"
  end

  @doc false
  def normalize_targets_for_test(values), do: normalize_targets(values)

  defp normalize_targets(values) do
    values
    |> Enum.filter(&is_binary/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
  end

  defp content_type_from_headers(headers) when is_list(headers) do
    headers
    |> Enum.find_value("image/jpeg", fn
      {"Content-Type", value} -> value |> String.split(";") |> List.first() |> String.trim()
      {"content-type", value} -> value |> String.split(";") |> List.first() |> String.trim()
      _ -> nil
    end)
  end

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
