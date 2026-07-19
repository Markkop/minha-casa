defmodule MinhaCasaAiWeb.PublicError do
  @moduledoc """
  Safe Portuguese messages for client-facing API responses.

  Technical details are logged server-side; clients receive `{ error, code? }`.
  """

  require Logger

  import Plug.Conn
  import Phoenix.Controller

  @generic "Não foi possível completar esta ação. Tente novamente."
  @analysis_failure "Não foi possível concluir esta análise."
  @analysis_step_failure "Não foi possível concluir esta parte da análise."

  @technical_patterns [
    ~r/^:/,
    ~r/\binspect\b/i,
    ~r/\bphoenix\b/i,
    ~r/\bstripe\b/i,
    ~r/\bopenai\b/i,
    ~r/\bhermes\b/i,
    ~r/\bminio\b/i,
    ~r/\bdocker\b/i,
    ~r/\.env\b/i,
    ~r/cannot reach/i,
    ~r/stack\s*trace/i,
    ~r/ecto\.changeset/i,
    ~r/can't be blank/i,
    ~r/is invalid/i,
    ~r/is not a supported/i,
    ~r/\bHTTP\s+\d{3}\b/i,
    ~r/\boban_/i,
    ~r/\battachment\b/i,
    ~r/\bworkspace\b/i,
    ~r/\bparsing\b/i,
    ~r/failed to /i,
    ~r/internal server/i,
    ~r/\[validation:/i
  ]

  @field_labels %{
    "title" => "título",
    "address" => "endereço",
    "propertyType" => "tipo de imóvel",
    "stage" => "etapa",
    "price" => "preço",
    "data" => "dados do imóvel"
  }

  @english_messages %{
    "not found" => "Conteúdo não encontrado.",
    "unauthorized" => "Sessão expirada. Faça login novamente.",
    "forbidden" => "Você não tem permissão para esta ação.",
    "invalid or missing authentication token" => "Sessão expirada. Faça login novamente.",
    "you do not have access to this workspace" =>
      "Você não tem acesso a este perfil de trabalho.",
    "external access is limited to granted collections" =>
      "Seu acesso é limitado às coleções compartilhadas com você.",
    "workspace is read-only" =>
      "Seu perfil está em modo somente leitura. Renove a assinatura para editar.",
    "listing not found" => "Imóvel não encontrado.",
    "collection not found" => "Coleção não encontrada.",
    "share not found" => "Compartilhamento não encontrado.",
    "invite not found" => "Convite não encontrado.",
    "invite has expired" => "Este convite expirou.",
    "invite is no longer available" => "Este convite não está mais disponível.",
    "organization not found" => "Imobiliária não encontrada.",
    "agency not found" => "Imobiliária não encontrada.",
    "analysis not found" => "Análise não encontrada.",
    "portal search not found" => "Busca não encontrada.",
    "invalid listing data" => "Alguns dados do imóvel são inválidos. Revise e tente novamente.",
    "listing title and address are required" => "Informe título e endereço do imóvel.",
    "listing data is required" => "Informe os dados do imóvel.",
    "token is required" => "Link de compartilhamento inválido.",
    "invalid share" => "Compartilhamento inválido.",
    "this invitation was sent to another email" =>
      "Este convite foi enviado para outro e-mail.",
    "invitation is no longer available" => "Este convite não está mais disponível.",
    "editable sharing is not available for this plan" =>
      "Compartilhamento com edição não está disponível no seu plano.",
    "payment system is not configured" =>
      "Pagamentos temporariamente indisponíveis. Tente novamente mais tarde.",
    "plan not found" => "Plano não encontrado.",
    "plan is not available" => "Este plano não está disponível.",
    "planid is required" => "Selecione um plano para continuar.",
    "this agency already has an active subscription." =>
      "Esta imobiliária já possui uma assinatura ativa.",
    "an agency owned by the billing user is required." =>
      "É necessário ter uma imobiliária vinculada para assinar.",
    "no stripe customer on file. subscribe once through checkout first." =>
      "Conclua uma assinatura antes de acessar o portal de cobrança.",
    "user not found" => "Usuário não encontrado.",
    "invalid image index" => "Imagem não encontrada.",
    "image not found" => "Imagem não encontrada.",
    "invalid data" => "Verifique os dados informados e tente novamente.",
    "missing profile" => "Perfil de trabalho não encontrado. Selecione um perfil e tente novamente.",
    "collection limit reached" => "Você atingiu o limite de coleções do seu plano.",
    "listing limit reached" => "Você atingiu o limite de imóveis do seu plano.",
    "duplicate candidates found" => "Encontramos imóveis parecidos. Escolha como deseja continuar.",
    "name must have between 2 and 100 characters" =>
      "O nome deve ter entre 2 e 100 caracteres.",
    "only owners and admins can rename an agency" =>
      "Somente proprietários e administradores podem renomear a imobiliária.",
    "only owners and admins can manage invites" =>
      "Somente proprietários e administradores podem gerenciar convites.",
    "a user can belong to only one family" =>
      "Cada usuário pode pertencer a apenas um grupo familiar.",
    "invalid json body" => "Não foi possível processar os dados enviados."
  }

  @doc false
  def generic, do: @generic

  @doc false
  def analysis_failure, do: @analysis_failure

  @doc false
  def analysis_step_failure, do: @analysis_step_failure

  @doc """
  Responds with a safe JSON error payload.
  """
  def json_error(conn, status, reason, opts \\ []) do
    payload = build_payload(reason, opts)
    log_if_needed(reason, payload)
    conn |> put_status(status) |> json(payload)
  end

  @doc false
  def build_payload(reason, opts \\ []) do
    code = Keyword.get(opts, :code) || code_for(reason)
    message = message_for(reason, opts)

    if code do
      %{error: message, code: code}
    else
      %{error: message}
    end
  end

  @doc false
  def message_for(reason, opts \\ []) do
    default = Keyword.get(opts, :default, @generic)
    context = Keyword.get(opts, :context)

    cond do
      is_binary(reason) ->
        sanitize_or_default(reason, default)

      is_atom(reason) ->
        atom_message(reason, default, context)

      match?(%Ecto.Changeset{}, reason) ->
        changeset_message(reason)

      is_tuple(reason) ->
        Logger.warning("[PublicError] Tuple reason leaked: #{inspect(reason)}")
        default

      true ->
        Logger.warning("[PublicError] Unhandled reason: #{inspect(reason)}")
        default
    end
  end

  @doc false
  def changeset_message(%Ecto.Changeset{} = _changeset) do
    "Verifique os dados informados e tente novamente."
  end

  @doc false
  def sanitize(nil), do: nil
  def sanitize(""), do: nil

  def sanitize(text) when is_binary(text) do
    trimmed = String.trim(text)

    cond do
      trimmed == "" -> nil
      technical?(trimmed) -> nil
      true ->
        case Map.get(@english_messages, String.downcase(trimmed)) do
          nil -> trimmed
          mapped -> mapped
        end
    end
  end

  def sanitize(_), do: nil

  @doc false
  def public_failure_message(nil), do: nil

  def public_failure_message(text) when is_binary(text) do
    sanitize(text) || @analysis_failure
  end

  def public_failure_message(_), do: @analysis_failure

  @doc false
  def sanitize_listing_details(details) when is_list(details) do
    Enum.map(details, &sanitize_listing_detail/1)
  end

  def sanitize_listing_details(_), do: []

  defp sanitize_listing_detail(%{field: field, reason: reason}) do
    %{field: public_field_label(field), reason: listing_reason_message(reason)}
  end

  defp sanitize_listing_detail(detail) when is_map(detail) do
  field = Map.get(detail, :field) || Map.get(detail, "field")
  reason = Map.get(detail, :reason) || Map.get(detail, "reason")
  %{field: public_field_label(field), reason: listing_reason_message(reason)}
  end

  defp sanitize_listing_detail(_), do: %{field: "dados", reason: "Valor inválido."}

  defp listing_reason_message(reason) when is_binary(reason) do
    case String.downcase(reason) do
      "must be an object" -> "Formato inválido."
      "is not a supported value" -> "Valor não suportado."
      "is invalid" -> "Valor inválido."
      "can't be blank" -> "Campo obrigatório."
      other -> sanitize_or_default(other, "Valor inválido.")
    end
  end

  defp listing_reason_message(_), do: "Valor inválido."

  defp public_field_label(field) when is_binary(field) do
    Map.get(@field_labels, field, "campo")
  end

  defp public_field_label(_), do: "campo"

  defp sanitize_or_default(text, default) do
    normalized = text |> String.trim()

    case Map.get(@english_messages, String.downcase(normalized)) do
      nil ->
        cond do
          technical?(normalized) -> default || @generic
          default == nil -> normalized
          true -> normalized
        end

      mapped ->
        mapped
    end
  end

  defp technical?(text) do
    Enum.any?(@technical_patterns, &Regex.match?(&1, text))
  end

  defp atom_message(:not_found, _default, :listing), do: "Imóvel não encontrado."
  defp atom_message(:not_found, _default, :collection), do: "Coleção não encontrada."
  defp atom_message(:not_found, _default, :share), do: "Compartilhamento não encontrado."
  defp atom_message(:not_found, _default, :invite), do: "Convite não encontrado."
  defp atom_message(:not_found, _default, :organization), do: "Imobiliária não encontrada."
  defp atom_message(:not_found, _default, :agency), do: "Imobiliária não encontrada."
  defp atom_message(:not_found, _default, :analysis), do: "Análise não encontrada."
  defp atom_message(:not_found, _default, :link), do: "Link não encontrado."
  defp atom_message(:not_found, _default, _), do: "Conteúdo não encontrado."

  defp atom_message(:listing_not_found, _default, _), do: "Imóvel não encontrado."
  defp atom_message(:collection_not_found, _default, _), do: "Coleção não encontrada."
  defp atom_message(:unauthorized, _default, _), do: "Sessão expirada. Faça login novamente."
  defp atom_message(:forbidden, _default, _), do: "Você não tem permissão para esta ação."
  defp atom_message(:invalid, _default, _), do: "Verifique os dados informados e tente novamente."
  defp atom_message(:invalid_request, _default, _), do: "Não foi possível processar a solicitação."
  defp atom_message(:invalid_url, _default, _), do: "Informe um link válido (http ou https)."
  defp atom_message(:empty_text, _default, _), do: "O texto não pode estar vazio."
  defp atom_message(:file_too_large, _default, _), do: "Arquivo muito grande."
  defp atom_message(:empty_file, _default, _), do: "Arquivo vazio."
  defp atom_message(:invalid_base64, _default, _), do: "Arquivo inválido."
  defp atom_message(:quota_exceeded, _default, _), do: "Limite de uso atingido. Tente novamente mais tarde."
  defp atom_message(:limit_reached, _default, _), do: "Limite de uso atingido. Tente novamente mais tarde."
  defp atom_message(:workspace_frozen, _default, _), do: "Seu perfil está em modo somente leitura."
  defp atom_message(:collection_limit, _default, _), do: "Você atingiu o limite de coleções do seu plano."
  defp atom_message(:listing_limit, _default, _), do: "Você atingiu o limite de imóveis do seu plano."
  defp atom_message(:stripe_not_configured, _default, _), do: "Pagamentos temporariamente indisponíveis."
  defp atom_message(:inactive_plan, _default, _), do: "Este plano não está disponível."
  defp atom_message(:already_subscribed, _default, _), do: "Esta imobiliária já possui uma assinatura ativa."
  defp atom_message(:email_mismatch, _default, _), do: "Este convite foi enviado para outro e-mail."
  defp atom_message(:expired, _default, _), do: "Este link expirou."
  defp atom_message(:unavailable, _default, _), do: "Este conteúdo não está mais disponível."
  defp atom_message(:sharing_not_allowed, _default, _), do: "Compartilhamento com edição não está disponível no seu plano."
  defp atom_message(:parsing_forbidden, _default, _), do: "A leitura automática não está disponível neste perfil."
  defp atom_message(:invalid_listing, _default, _), do: "Informe título e endereço do imóvel."

  defp atom_message(reason, default, _context) do
    Logger.warning("[PublicError] Unmapped atom: #{inspect(reason)}")
    default
  end

  defp code_for(:workspace_frozen), do: "workspace_frozen"
  defp code_for(:collection_limit), do: "collection_limit"
  defp code_for(:listing_limit), do: "listing_limit"
  defp code_for(:quota_exceeded), do: "quota_exceeded"
  defp code_for(:limit_reached), do: "limit_reached"
  defp code_for(:plan_conflict), do: "plan_conflict"
  defp code_for(:license_limit), do: "license_limit"
  defp code_for(_), do: nil

  defp log_if_needed(reason, %{error: message}) do
    if should_log?(reason, message) do
      Logger.warning("[PublicError] #{inspect(reason)} -> #{message}")
    end
  end

  defp should_log?(reason, message) when is_binary(reason), do: reason != message
  defp should_log?(reason, message) when is_atom(reason), do: atom_message(reason, @generic, nil) != message
  defp should_log?(%Ecto.Changeset{}, _message), do: false
  defp should_log?(_, _), do: true
end
