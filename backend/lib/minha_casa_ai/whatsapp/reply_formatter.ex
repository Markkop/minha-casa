defmodule MinhaCasaAi.WhatsApp.ReplyFormatter do
  @moduledoc false
  defdelegate workflow_summary(result), to: MinhaCasaAi.Channel.ReplyFormatter
  defdelegate error(reason), to: MinhaCasaAi.Channel.ReplyFormatter
end
