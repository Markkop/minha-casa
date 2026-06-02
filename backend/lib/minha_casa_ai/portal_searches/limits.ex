defmodule MinhaCasaAi.PortalSearches.Limits do
  @moduledoc """
  Page and target limits for portal searches.
  Regular users are capped at one page; admins may raise the per-search limit.
  """

  @default_max_pages 1
  @admin_max_pages 10
  @max_targets 60

  def default_max_pages, do: @default_max_pages
  def admin_max_pages, do: @admin_max_pages
  def max_targets, do: @max_targets

  def max_pages(admin \\ false) do
    if admin, do: @admin_max_pages, else: @default_max_pages
  end

  def clamp_pages(requested, admin \\ false)

  def clamp_pages(requested, admin) when is_integer(requested) do
    min(max(requested, 1), max_pages(admin))
  end

  def clamp_pages(requested, admin) when is_binary(requested) do
    case Integer.parse(requested) do
      {n, _} -> clamp_pages(n, admin)
      :error -> max_pages(admin)
    end
  end

  def clamp_pages(_, admin), do: max_pages(admin)
end
