defmodule MinhaCasaAi.Integrations.Langfuse.Trace do
  @moduledoc """
  Fail-open Langfuse trace/span/generation helpers.
  """

  alias MinhaCasaAi.Integrations.Langfuse.IngestionBuffer

  @type ctx :: %{
          optional(:trace_id) => String.t(),
          optional(:parent_observation_id) => String.t() | nil,
          optional(:observation_id) => String.t(),
          optional(:name) => String.t(),
          optional(:metadata) => map(),
          optional(:user_id) => String.t() | nil,
          optional(:session_id) => String.t() | nil,
          optional(:tags) => [String.t()],
          optional(:prompt_ref) => map() | nil
        }

  def resume_trace(trace_id, opts \\ []) when is_binary(trace_id) do
    %{
      trace_id: trace_id,
      parent_observation_id: nil,
      observation_id: nil,
      name: Keyword.get(opts, :name, "trace"),
      metadata: Keyword.get(opts, :metadata, %{}),
      user_id: Keyword.get(opts, :user_id),
      session_id: Keyword.get(opts, :session_id),
      tags: Keyword.get(opts, :tags, [])
    }
  end

  def new_trace(name, opts \\ []) when is_binary(name) do
    trace_id = Keyword.get(opts, :id, unique_id())

    ctx = %{
      trace_id: trace_id,
      parent_observation_id: nil,
      observation_id: nil,
      name: name,
      metadata: Keyword.get(opts, :metadata, %{}),
      user_id: Keyword.get(opts, :user_id),
      session_id: Keyword.get(opts, :session_id),
      tags: Keyword.get(opts, :tags, [])
    }

    emit_trace_create(ctx)
    ctx
  end

  def child_span(parent_ctx, name, opts \\ []) when is_map(parent_ctx) and is_binary(name) do
    span_id = Keyword.get(opts, :id, unique_id())

    ctx = %{
      parent_ctx
      | parent_observation_id: parent_ctx[:observation_id],
        observation_id: span_id,
        name: name,
        metadata: Map.merge(parent_ctx[:metadata] || %{}, Keyword.get(opts, :metadata, %{}))
    }

    emit_span_create(ctx, :start)
    ctx
  end

  def end_span(ctx, opts \\ []) when is_map(ctx) do
    output = Keyword.get(opts, :output)
    level = Keyword.get(opts, :level, "DEFAULT")
    status_message = Keyword.get(opts, :status_message)

    emit_span_create(ctx, :end, output: output, level: level, status_message: status_message)
    ctx
  end

  def generation(ctx, attrs, opts \\ []) when is_map(ctx) and is_map(attrs) do
    gen_id = Keyword.get(opts, :id, unique_id())
    now = utc_now()

    body =
      %{
        "id" => gen_id,
        "traceId" => ctx[:trace_id],
        "name" => Map.get(attrs, :name, ctx[:name]),
        "startTime" => Map.get(attrs, :start_time, now),
        "endTime" => Map.get(attrs, :end_time, now),
        "model" => Map.get(attrs, :model),
        "input" => truncate(Map.get(attrs, :input)),
        "output" => truncate(Map.get(attrs, :output)),
        "metadata" => Map.get(attrs, :metadata, ctx[:metadata] || %{}),
        "level" => Map.get(attrs, :level, "DEFAULT"),
        "statusMessage" => Map.get(attrs, :status_message)
      }
      |> maybe_put_parent(ctx[:parent_observation_id])
      |> maybe_put_usage(Map.get(attrs, :usage))
      |> maybe_put_prompt(Map.get(attrs, :prompt_ref) || ctx[:prompt_ref])

    event = %{
      "id" => unique_id(),
      "type" => "generation-create",
      "timestamp" => now,
      "body" => body
    }

    IngestionBuffer.push(event)
    Map.put(ctx, :observation_id, gen_id)
  end

  def with_span(parent_ctx, name, fun, opts \\ []) when is_function(fun, 0) do
    span_ctx = child_span(parent_ctx, name, opts)

    try do
      result = fun.()
      end_span(span_ctx, output: summarize_result(result))
      {:ok, result, span_ctx}
    rescue
      e ->
        end_span(span_ctx,
          level: "ERROR",
          status_message: Exception.message(e),
          output: Exception.message(e)
        )

        reraise e, __STACKTRACE__
    catch
      kind, reason ->
        end_span(span_ctx,
          level: "ERROR",
          status_message: Exception.format(kind, reason, []),
          output: inspect(reason)
        )

        :erlang.raise(kind, reason, __STACKTRACE__)
    end
  end

  def emit_trace_create(ctx) do
    now = utc_now()

    body =
      %{
        "id" => ctx[:trace_id],
        "name" => ctx[:name],
        "metadata" => ctx[:metadata] || %{},
        "tags" => ctx[:tags] || []
      }
      |> maybe_put_string("userId", ctx[:user_id])
      |> maybe_put_string("sessionId", ctx[:session_id])

    IngestionBuffer.push(%{
      "id" => unique_id(),
      "type" => "trace-create",
      "timestamp" => now,
      "body" => body
    })
  end

  defp emit_span_create(ctx, phase, extra \\ []) do
    now = utc_now()
    span_id = ctx[:observation_id] || unique_id()

    base =
      %{
        "id" => span_id,
        "traceId" => ctx[:trace_id],
        "name" => ctx[:name],
        "metadata" => ctx[:metadata] || %{}
      }
      |> maybe_put_parent(ctx[:parent_observation_id])

    body =
      case phase do
        :start ->
          Map.merge(base, %{"startTime" => now})

        :end ->
          Map.merge(base, %{
            "startTime" => now,
            "endTime" => now,
            "output" => truncate(Keyword.get(extra, :output)),
            "level" => Keyword.get(extra, :level, "DEFAULT"),
            "statusMessage" => Keyword.get(extra, :status_message)
          })
      end

    IngestionBuffer.push(%{
      "id" => unique_id(),
      "type" => "span-create",
      "timestamp" => now,
      "body" => body
    })
  end

  defp maybe_put_parent(body, nil), do: body
  defp maybe_put_parent(body, id), do: Map.put(body, "parentObservationId", id)

  defp maybe_put_usage(body, nil), do: body

  defp maybe_put_usage(body, usage) when is_map(usage) do
    Map.put(body, "usage", %{
      "input" => Map.get(usage, :input) || Map.get(usage, "input"),
      "output" => Map.get(usage, :output) || Map.get(usage, "output"),
      "total" => Map.get(usage, :total) || Map.get(usage, "total"),
      "unit" => Map.get(usage, :unit, "TOKENS")
    })
  end

  defp maybe_put_prompt(body, nil), do: body

  defp maybe_put_prompt(body, %{name: name} = ref) do
    body
    |> Map.put("promptName", name)
    |> maybe_put_int("promptVersion", Map.get(ref, :version))
  end

  defp maybe_put_prompt(body, %{"name" => name} = ref) do
    maybe_put_prompt(body, %{name: name, version: Map.get(ref, "version")})
  end

  defp maybe_put_string(map, _key, nil), do: map
  defp maybe_put_string(map, key, value) when is_binary(value), do: Map.put(map, key, value)
  defp maybe_put_int(map, _key, nil), do: map
  defp maybe_put_int(map, key, value) when is_integer(value), do: Map.put(map, key, value)

  defp truncate(data) when is_binary(data) do
    if String.length(data) > 12_000 do
      String.slice(data, 0, 12_000) <> "…"
    else
      data
    end
  end

  defp truncate(data), do: data |> inspect(limit: 4000) |> truncate()

  defp summarize_result({:ok, value}), do: truncate(inspect(value, limit: 2000))
  defp summarize_result({:error, reason}), do: truncate(inspect(reason, limit: 2000))
  defp summarize_result(other), do: truncate(inspect(other, limit: 2000))

  defp utc_now do
    DateTime.utc_now()
    |> DateTime.truncate(:millisecond)
    |> DateTime.to_iso8601()
  end

  def unique_id do
    Base.encode16(:crypto.strong_rand_bytes(16), case: :lower)
  end
end
