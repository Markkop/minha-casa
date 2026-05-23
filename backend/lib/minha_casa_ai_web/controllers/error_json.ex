defmodule MinhaCasaAiWeb.ErrorJSON do
  def render("404.json", _assigns), do: %{error: "Not found"}
  def render("500.json", _assigns), do: %{error: "Internal server error"}
  def template_not_found(_template, _assigns), do: %{error: "Internal server error"}
end
