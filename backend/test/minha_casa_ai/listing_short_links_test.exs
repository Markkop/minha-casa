defmodule MinhaCasaAi.ListingShortLinksTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.ListingShortLinks

  test "short_url falls back to listing_url when app base is unset" do
    prev = Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])

    on_exit(fn ->
      Application.put_env(:minha_casa_ai, MinhaCasaAi.Config, prev)
    end)

    Application.put_env(:minha_casa_ai, MinhaCasaAi.Config, Keyword.delete(prev, :app_public_url))

    url = ListingShortLinks.short_url("collection-id", "listing-id")
    assert url == nil
  end
end
