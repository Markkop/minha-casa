defmodule MinhaCasaAiWeb.FloorPlanController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.FloorPlans
  alias MinhaCasaAiWeb.{FloorPlanJSON, PublicError}

  def index(conn, %{"collection_id" => collection_id, "listing_id" => listing_id}) do
    case FloorPlans.list(collection_id, listing_id, profile(conn)) do
      {:ok, floor_plans} -> json(conn, FloorPlanJSON.index(floor_plans, collection_id))
      {:error, reason} -> render_error(conn, reason)
    end
  end

  def create(conn, %{"collection_id" => collection_id, "listing_id" => listing_id} = params) do
    case FloorPlans.create(collection_id, listing_id, profile(conn), params) do
      {:ok, floor_plan} ->
        conn
        |> put_status(:created)
        |> json(FloorPlanJSON.show(floor_plan, collection_id))

      {:error, reason} ->
        render_error(conn, reason)
    end
  end

  def show(conn, %{
        "collection_id" => collection_id,
        "listing_id" => listing_id,
        "plan_id" => floor_plan_id
      }) do
    case FloorPlans.fetch(collection_id, listing_id, floor_plan_id, profile(conn)) do
      {:ok, floor_plan} -> json(conn, FloorPlanJSON.show(floor_plan, collection_id))
      {:error, reason} -> render_error(conn, reason)
    end
  end

  def update(
        conn,
        %{
          "collection_id" => collection_id,
          "listing_id" => listing_id,
          "plan_id" => floor_plan_id
        } = params
      ) do
    case FloorPlans.rename(collection_id, listing_id, floor_plan_id, profile(conn), params) do
      {:ok, floor_plan} -> json(conn, FloorPlanJSON.show(floor_plan, collection_id))
      {:error, reason} -> render_error(conn, reason)
    end
  end

  def save_document(
        conn,
        %{
          "collection_id" => collection_id,
          "listing_id" => listing_id,
          "plan_id" => floor_plan_id
        } = params
      ) do
    case FloorPlans.save_document(
           collection_id,
           listing_id,
           floor_plan_id,
           profile(conn),
           params
         ) do
      {:ok, floor_plan} ->
        json(conn, FloorPlanJSON.show(floor_plan, collection_id))

      {:error, {:revision_conflict, current_revision}} ->
        conn
        |> put_status(:conflict)
        |> json(%{
          error: "A planta foi alterada em outra sessão. Recarregue para continuar.",
          code: "revision_conflict",
          currentRevision: current_revision
        })

      {:error, reason} ->
        render_error(conn, reason)
    end
  end

  def delete(conn, %{
        "collection_id" => collection_id,
        "listing_id" => listing_id,
        "plan_id" => floor_plan_id
      }) do
    case FloorPlans.delete(collection_id, listing_id, floor_plan_id, profile(conn)) do
      {:ok, _floor_plan} -> send_resp(conn, :no_content, "")
      {:error, reason} -> render_error(conn, reason)
    end
  end

  def upload_blueprint(
        conn,
        %{
          "collection_id" => collection_id,
          "listing_id" => listing_id,
          "plan_id" => floor_plan_id,
          "file" => upload
        } = params
      ) do
    case FloorPlans.upload_blueprint(
           collection_id,
           listing_id,
           floor_plan_id,
           profile(conn),
           upload,
           params
         ) do
      {:ok, floor_plan} -> json(conn, FloorPlanJSON.show(floor_plan, collection_id))
      {:error, reason} -> render_error(conn, reason)
    end
  end

  def upload_blueprint(conn, _params), do: render_error(conn, :invalid_blueprint)

  def show_blueprint(conn, %{
        "collection_id" => collection_id,
        "listing_id" => listing_id,
        "plan_id" => floor_plan_id
      }) do
    case FloorPlans.fetch_blueprint(
           collection_id,
           listing_id,
           floor_plan_id,
           profile(conn)
         ) do
      {:ok, _floor_plan, bytes, content_type} ->
        conn
        |> put_resp_content_type(content_type)
        |> put_resp_header("cache-control", "private, no-store")
        |> send_resp(:ok, bytes)

      {:error, reason} ->
        render_error(conn, reason)
    end
  end

  def delete_blueprint(conn, %{
        "collection_id" => collection_id,
        "listing_id" => listing_id,
        "plan_id" => floor_plan_id
      }) do
    case FloorPlans.delete_blueprint(
           collection_id,
           listing_id,
           floor_plan_id,
           profile(conn)
         ) do
      {:ok, floor_plan} -> json(conn, FloorPlanJSON.show(floor_plan, collection_id))
      {:error, reason} -> render_error(conn, reason)
    end
  end

  defp profile(conn) do
    %{
      user_id: conn.assigns[:current_user_id],
      org_id: conn.assigns[:current_org_id],
      workspace_id: conn.assigns[:current_workspace_id]
    }
  end

  defp render_error(conn, :collection_not_found),
    do: PublicError.json_error(conn, :not_found, "collection not found")

  defp render_error(conn, :listing_not_found),
    do: PublicError.json_error(conn, :not_found, "listing not found")

  defp render_error(conn, :floor_plan_not_found),
    do: PublicError.json_error(conn, :not_found, "Planta não encontrada.")

  defp render_error(conn, :blueprint_not_found),
    do: PublicError.json_error(conn, :not_found, "Imagem da planta não encontrada.")

  defp render_error(conn, :floor_plan_limit) do
    conn
    |> put_status(:conflict)
    |> json(%{error: "Limite de plantas atingido.", code: "floor_plan_limit"})
  end

  defp render_error(conn, :workspace_frozen),
    do: PublicError.json_error(conn, :locked, :workspace_frozen)

  defp render_error(conn, :blueprint_too_large),
    do: PublicError.json_error(conn, :payload_too_large, "A imagem excede o limite de 10 MiB.")

  defp render_error(conn, :invalid_blueprint_type),
    do: PublicError.json_error(conn, :unsupported_media_type, "Formato de imagem não aceito.")

  defp render_error(conn, :minio_not_configured),
    do: PublicError.json_error(conn, :service_unavailable, "Armazenamento indisponível.")

  defp render_error(conn, reason)
       when reason in [
              :invalid_document,
              :invalid_expected_revision,
              :invalid_area_links,
              :invalid_area_link_shape,
              :duplicate_area_link,
              :invalid_environment,
              :invalid_area_name,
              :invalid_blueprint,
              :empty_blueprint
            ],
       do: PublicError.json_error(conn, :unprocessable_entity, "Dados da planta inválidos.")

  defp render_error(conn, %Ecto.Changeset{} = changeset),
    do: PublicError.json_error(conn, :unprocessable_entity, changeset)

  defp render_error(conn, _reason),
    do: PublicError.json_error(conn, :internal_server_error, :floor_plan_failed)
end
