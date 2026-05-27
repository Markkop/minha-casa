defmodule MinhaCasaAi.Integrations.HermesAgentTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.HermesAgent

  test "creates a run, polls it, and decodes JSON output" do
    {:ok, calls} =
      Agent.start_link(fn ->
        [
          {:post, %{"run_id" => "run_1", "status" => "started"}},
          {:get, %{"run_id" => "run_1", "status" => "running"}},
          {:get,
           %{"run_id" => "run_1", "status" => "completed", "output" => "{\"schemaVersion\":3}"}}
        ]
      end)

    request_fun = scripted_request(calls)

    assert {:ok, %{"schemaVersion" => 3}} =
             HermesAgent.run("prompt",
               base_url: "http://hermes:8642",
               api_key: "secret",
               request_fun: request_fun,
               sleep_fun: fn _ -> :ok end
             )
  end

  test "returns failed run details" do
    {:ok, calls} =
      Agent.start_link(fn ->
        [
          {:post, %{"run_id" => "run_1", "status" => "started"}},
          {:get, %{"run_id" => "run_1", "status" => "failed", "error" => "boom"}}
        ]
      end)

    assert {:error, {:hermes_run_failed, "boom"}} =
             HermesAgent.run("prompt",
               base_url: "http://hermes:8642",
               api_key: "secret",
               request_fun: scripted_request(calls),
               sleep_fun: fn _ -> :ok end
             )
  end

  test "returns cancelled run" do
    {:ok, calls} =
      Agent.start_link(fn ->
        [
          {:post, %{"run_id" => "run_1", "status" => "started"}},
          {:get, %{"run_id" => "run_1", "status" => "cancelled"}}
        ]
      end)

    assert {:error, :hermes_run_cancelled} =
             HermesAgent.run("prompt",
               base_url: "http://hermes:8642",
               api_key: "secret",
               request_fun: scripted_request(calls),
               sleep_fun: fn _ -> :ok end
             )
  end

  test "times out while polling" do
    {:ok, calls} =
      Agent.start_link(fn ->
        [
          {:post, %{"run_id" => "run_1", "status" => "started"}},
          {:get, %{"run_id" => "run_1", "status" => "running"}},
          {:get, %{"run_id" => "run_1", "status" => "running"}}
        ]
      end)

    {:ok, clock} = Agent.start_link(fn -> 0 end)

    now_fun = fn ->
      Agent.get_and_update(clock, fn value -> {value, value + 1_000} end)
    end

    assert {:error, :hermes_timeout} =
             HermesAgent.run("prompt",
               base_url: "http://hermes:8642",
               api_key: "secret",
               request_fun: scripted_request(calls),
               sleep_fun: fn _ -> :ok end,
               now_fun: now_fun,
               timeout_ms: 500
             )
  end

  test "rejects invalid JSON output" do
    assert {:error, :invalid_hermes_json} =
             HermesAgent.extract_result(%{"status" => "completed", "output" => "not json"})
  end

  defp scripted_request(calls) do
    fn method, _url, headers, body, _timeout ->
      assert {"authorization", "Bearer secret"} in headers

      if method == :post do
        assert is_map(body)
        assert is_binary(body["input"])
      end

      Agent.get_and_update(calls, fn
        [{^method, response} | rest] -> {{:ok, response}, rest}
        other -> {{:error, {:unexpected_request, method, other}}, other}
      end)
    end
  end
end
