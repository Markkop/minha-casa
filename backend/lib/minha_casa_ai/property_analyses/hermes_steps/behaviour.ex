defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Behaviour do
  @moduledoc false

  @callback key() :: String.t()
  @callback prompt(map(), map() | nil, keyword()) :: String.t()
  @callback normalize(map(), map()) :: map()
end
