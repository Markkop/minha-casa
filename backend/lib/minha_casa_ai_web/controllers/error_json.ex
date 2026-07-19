defmodule MinhaCasaAiWeb.ErrorJSON do
  def render("404.json", _assigns), do: %{error: "Conteúdo não encontrado."}
  def render("500.json", _assigns), do: %{error: "Algo deu errado. Tente novamente em instantes."}
  def template_not_found(_template, _assigns), do: %{error: "Algo deu errado. Tente novamente em instantes."}
end
