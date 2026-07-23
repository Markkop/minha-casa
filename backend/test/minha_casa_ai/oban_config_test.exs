defmodule MinhaCasaAi.ObanConfigTest do
  use ExUnit.Case, async: true

  test "serializes image jobs to respect the scraping provider concurrency limit" do
    queues =
      :minha_casa_ai
      |> Application.fetch_env!(Oban)
      |> Keyword.fetch!(:queues)

    assert Keyword.fetch!(queues, :images) == 1
  end
end
