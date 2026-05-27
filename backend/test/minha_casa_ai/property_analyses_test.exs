defmodule MinhaCasaAi.PropertyAnalysesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PropertyAnalyses

  describe "format_step_reason/1" do
    test "hermes timeout" do
      assert PropertyAnalyses.format_step_reason(:hermes_timeout) =~ "Tempo excedido"
    end

    test "invalid json" do
      assert PropertyAnalyses.format_step_reason(:invalid_hermes_json) =~ "JSON"
    end

    test "hermes run failed tuple" do
      msg = PropertyAnalyses.format_step_reason({:hermes_run_failed, "model error"})
      assert msg =~ "Hermes"
      assert msg =~ "model error"
    end

    test "http error tuple" do
      msg = PropertyAnalyses.format_step_reason({:hermes_http_error, 401, "unauthorized"})
      assert msg =~ "401"
    end
  end

  describe "valid_pipeline_step?/1" do
    test "accepts known steps" do
      assert PropertyAnalyses.valid_pipeline_step?("riscos")
      assert PropertyAnalyses.valid_pipeline_step?("xray")
    end

    test "rejects unknown" do
      refute PropertyAnalyses.valid_pipeline_step?("geocode")
    end
  end
end
