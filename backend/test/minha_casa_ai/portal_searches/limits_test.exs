defmodule MinhaCasaAi.PortalSearches.LimitsTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PortalSearches.Limits

  test "non-admin users are capped at one page" do
    assert Limits.clamp_pages(1, false) == 1
    assert Limits.clamp_pages(5, false) == 1
  end

  test "admins can raise the page limit up to the admin ceiling" do
    assert Limits.clamp_pages(3, true) == 3
    assert Limits.clamp_pages(99, true) == Limits.admin_max_pages()
  end
end
