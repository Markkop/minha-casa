defmodule MinhaCasaAi.Telegram.Templates do
  alias MinhaCasaAi.Config

  def welcome_with_link(code) do
    link = connect_url(code)

    """
    Olá! Sou o assistente Minha Casa no Telegram.

    Para usar o bot (enviar anúncios, links e arquivos para análise), conecte sua conta:

    #{link}

    Código: #{code}
    (válido por 30 minutos)
    """
    |> String.trim()
  end

  def linked_confirmation do
    """
    Conta conectada com sucesso!

    Agora você pode enviar textos, links, imagens ou PDFs de anúncios que eu analiso para você.
    """
    |> String.trim()
  end

  def connect_url(code) do
    base = Config.app_public_url() |> String.trim_trailing("/")
    "#{base}/conectar-telegram?tg=#{URI.encode_www_form(code)}"
  end
end
