defmodule MinhaCasaAiWeb.PortalSearchController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.PortalSearches
  alias MinhaCasaAi.PortalSearches.Broadcast
  alias MinhaCasaAi.Workspace.Profile
  alias MinhaCasaAiWeb.{PortalSearchJSON, PublicError}

  def index(conn, _params) do
    case profile(conn) do
      {:ok, profile} ->
        searches = PortalSearches.list_searches(profile)
        json(conn, %{searches: PortalSearchJSON.searches(searches)})

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def create(conn, params) do
    case profile(conn) do
      {:ok, profile} ->
        search = PortalSearches.create_search!(profile, params, admin: admin?(conn))

        conn
        |> put_status(:created)
        |> json(%{search: PortalSearchJSON.search(search)})

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def update(conn, %{"id" => id} = params) do
    case profile(conn) do
      {:ok, profile} ->
        case PortalSearches.get_search_for_profile!(id, profile) do
          {:ok, search} ->
            search = PortalSearches.update_search!(search, params, admin: admin?(conn))
            json(conn, %{search: PortalSearchJSON.search(search)})

          {:error, :not_found} ->
            PublicError.json_error(conn, :not_found, "portal search not found")
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def show(conn, %{"id" => id}) do
    case profile(conn) do
      {:ok, profile} ->
        case PortalSearches.get_search_for_profile!(id, profile) do
          {:ok, search} ->
            latest_run =
              if search.last_run_id do
                PortalSearches.get_run!(search.last_run_id)
              end

            json(conn, %{
              search: PortalSearchJSON.search(search),
              latestRun: if(latest_run, do: PortalSearchJSON.run(latest_run))
            })

          {:error, :not_found} ->
            PublicError.json_error(conn, :not_found, "portal search not found")
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def create_run(conn, %{"id" => id} = params) do
    refresh? = params["refresh"] in [true, "true", "1"]

    case profile(conn) do
      {:ok, profile} ->
        case PortalSearches.get_search_for_profile!(id, profile) do
          {:ok, search} ->
            case PortalSearches.start_run!(search, refresh: refresh?, admin: admin?(conn)) do
              {:ok, run, _trace} ->
                conn
                |> put_status(:accepted)
                |> json(%{run: PortalSearchJSON.run(run)})

              {:error, reason} ->
                PublicError.json_error(conn, :unprocessable_entity, reason)
            end

          {:error, :not_found} ->
            PublicError.json_error(conn, :not_found, "portal search not found")
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def show_run(conn, %{"id" => id, "run_id" => run_id}) do
    case profile(conn) do
      {:ok, profile} ->
        with {:ok, _search} <- PortalSearches.get_search_for_profile!(id, profile),
             {:ok, run} <- PortalSearches.get_run_for_search!(run_id, id) do
          targets = PortalSearches.list_targets(run.id)

          json(conn, %{
            run: PortalSearchJSON.run(run),
            targets: Enum.map(targets, &PortalSearchJSON.target/1)
          })
        else
          {:error, :not_found} ->
            PublicError.json_error(conn, :not_found, "Execução não encontrada.")
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def list_cards(conn, %{"id" => id, "run_id" => run_id} = params) do
    case profile(conn) do
      {:ok, profile} ->
        with {:ok, _search} <- PortalSearches.get_search_for_profile!(id, profile),
             {:ok, run} <- PortalSearches.get_run_for_search!(run_id, id) do
          filters =
            params
            |> Map.take(["portal", "bairro", "quartos"])
            |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" end)
            |> Map.new()

          cards = PortalSearches.list_cards(run.id, filters)

          json(conn, %{cards: Enum.map(cards, &PortalSearchJSON.card/1)})
        else
          {:error, :not_found} ->
            PublicError.json_error(conn, :not_found, "Execução não encontrada.")
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def run_cost(conn, %{"id" => id, "run_id" => run_id}) do
    case profile(conn) do
      {:ok, profile} ->
        with {:ok, _search} <- PortalSearches.get_search_for_profile!(id, profile),
             {:ok, run} <- PortalSearches.get_run_for_search!(run_id, id) do
          json(conn, %{cost: PortalSearchJSON.cost_summary(run)})
        else
          {:error, :not_found} ->
            PublicError.json_error(conn, :not_found, "Execução não encontrada.")
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def stream(conn, %{"id" => id, "run_id" => run_id}) do
    case profile(conn) do
      {:ok, profile} ->
        with {:ok, _search} <- PortalSearches.get_search_for_profile!(id, profile),
             {:ok, run} <- PortalSearches.get_run_for_search!(run_id, id) do
          conn =
            conn
            |> put_resp_content_type("text/event-stream")
            |> send_chunked(200)

          topic = Broadcast.topic(run.id)
          :ok = Phoenix.PubSub.subscribe(MinhaCasaAi.PubSub, topic)

          send_sse(conn, "connected", %{runId: run.id, status: run.status})
          sse_loop(conn)
        else
          {:error, :not_found} ->
            PublicError.json_error(conn, :not_found, "Execução não encontrada.")
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  defp sse_loop(conn) do
    receive do
      {event, payload} ->
        case send_sse(conn, Atom.to_string(event), payload) do
          {:ok, conn} -> sse_loop(conn)
          {:error, _} -> conn
        end
    after
      30_000 ->
        case send_sse(conn, "ping", %{}) do
          {:ok, conn} -> sse_loop(conn)
          {:error, _} -> conn
        end
    end
  end

  defp send_sse(conn, event, payload) do
    data = Jason.encode!(payload)
    chunk = "event: #{event}\ndata: #{data}\n\n"
    Plug.Conn.chunk(conn, chunk)
  end

  defp profile(conn) do
    case Profile.profile_from_headers(
           conn.assigns[:current_user_id],
           conn.assigns[:current_org_id],
           conn.assigns[:current_workspace_id]
         ) do
      {:error, :missing_profile} -> {:error, :unauthorized, :unauthorized}
      profile -> {:ok, profile}
    end
  end

  defp admin?(conn), do: conn.assigns[:current_user_is_admin] == true
end
