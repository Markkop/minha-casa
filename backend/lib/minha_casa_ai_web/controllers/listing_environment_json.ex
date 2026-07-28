defmodule MinhaCasaAiWeb.ListingEnvironmentJSON do
  @moduledoc false

  def index(%{images: images, environments: environments}) do
    %{images: images, environments: environments}
  end

  def show(environment), do: %{environment: environment}
  def deleted, do: %{success: true}
end
