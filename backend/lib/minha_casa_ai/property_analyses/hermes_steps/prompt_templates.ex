defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.PromptTemplates do
  @moduledoc """
  Builds Hermes step prompts via Langfuse (with snapshot fallback).
  """

  alias MinhaCasaAi.Integrations.Langfuse.Prompts
  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.{Ambientes, Step, Xray}
  alias MinhaCasaAi.PropertyAnalyses.InventoryVocab

  @categories Ambientes.categories()
  @multi_categories Ambientes.multi_categories()

  def pt_rules do
    case Prompts.compile("hermes/pt-rules", %{}) do
      {:ok, text, ref} -> {text, ref}
      _ -> {Step.pt_rules(), %{name: "hermes/pt-rules", version: 0}}
    end
  end

  def inventory_vocab_block do
    vars = %{
      "estruturais" => Enum.join(InventoryVocab.estruturais(), ", "),
      "instalacoes" => Enum.join(InventoryVocab.instalacoes(), ", "),
      "moveis" => Enum.join(InventoryVocab.moveis(), ", "),
      "materiais" => Enum.join(InventoryVocab.materiais(), ", ")
    }

    case Prompts.compile("hermes/inventory-vocab-block", vars) do
      {:ok, text, ref} -> {text, ref}
      _ -> {InventoryVocab.prompt_block(), %{name: "hermes/inventory-vocab-block", version: 0}}
    end
  end

  def clima(bundle, address) do
    {pt_rules, _} = pt_rules()
    ctx = Jason.encode!(Step.location_context(bundle, address))
    facts = facts_line(bundle)

    compile_step("hermes/step/clima", %{
      "ctx" => ctx,
      "facts" => facts,
      "pt_rules" => pt_rules
    })
  end

  def riscos(bundle, address) do
    {pt_rules, _} = pt_rules()
    ctx = Jason.encode!(Step.location_context(bundle, address))
    facts = facts_line(bundle)

    compile_step("hermes/step/riscos", %{
      "ctx" => ctx,
      "facts" => facts,
      "pt_rules" => pt_rules
    })
  end

  def mercado(bundle, address) do
    {pt_rules, _} = pt_rules()
    ctx = Jason.encode!(Step.location_context(bundle, address))
    input = Step.read_input_json(bundle)
    listing_data = Map.get(bundle, :listing_data) || %{}

    price_hint =
      [
        Map.get(listing_data, "price"),
        Map.get(listing_data, "privateAreaM2"),
        Map.get(listing_data, "totalAreaM2")
      ]
      |> Enum.reject(&is_nil/1)
      |> Jason.encode!()

    facts = facts_line(bundle)

    compile_step("hermes/step/mercado", %{
      "ctx" => ctx,
      "price_hint" => price_hint,
      "region_id" => inspect(Map.get(input, "regionId") || Map.get(listing_data, "regionId")),
      "facts" => facts,
      "pt_rules" => pt_rules
    })
  end

  def idade(bundle, address, opts) do
    {pt_rules, _} = pt_rules()
    ambientes = Keyword.get(opts, :ambientes, %{})
    ambientes_path = Map.get(bundle, :ambientes_path)
    ctx = Jason.encode!(Step.location_context(bundle, address))

    ambientes_json =
      if is_binary(ambientes_path) and File.exists?(ambientes_path) do
        File.read!(ambientes_path)
      else
        Jason.encode!(ambientes)
      end

    facts = Step.facts_text(bundle) || "n/d"

    compile_step("hermes/step/idade", %{
      "ctx" => ctx,
      "facts" => facts,
      "ambientes_json" => ambientes_json,
      "current_year" => Integer.to_string(Date.utc_today().year),
      "pt_rules" => pt_rules
    })
  end

  def ambientes(bundle) do
    {pt_rules, _} = pt_rules()
    {inventory_vocab, _} = inventory_vocab_block()

    input_path = Map.get(bundle, :input_path)
    images_dir = Path.join(Map.get(bundle, :root), "images")
    facts = Step.facts_text(bundle) || "n/d"
    catalog = Map.get(bundle, :catalog_count, 0)
    max_cards = min(catalog, 14)

    compile_step("hermes/step/ambientes", %{
      "input_path" => input_path,
      "images_dir" => images_dir,
      "facts" => facts,
      "catalog" => Integer.to_string(catalog),
      "max_cards" => Integer.to_string(max_cards),
      "categories" => Enum.join(@categories, ", "),
      "multi_categories" => Enum.join(@multi_categories, ", "),
      "inventory_vocab" => inventory_vocab,
      "pt_rules" => pt_rules
    })
  end

  def xray_card(bundle, address, card, context) do
    {pt_rules, _} = pt_rules()
    ctx = Jason.encode!(Step.location_context(bundle, address))
    clima = Jason.encode!(Map.get(context, :clima, %{}))
    riscos = Jason.encode!(Map.get(context, :riscos, %{}))
    idade = Jason.encode!(Map.get(context, :idade, %{}))
    facts = Step.facts_text(bundle) || "n/d"
    card_json = Jason.encode!(card)

    image_paths =
      card
      |> Map.get("imageIndices", [])
      |> Xray.image_paths_for_indices(bundle)
      |> Enum.join("\n")

    compile_step("hermes/step/xray-card", %{
      "ctx" => ctx,
      "clima" => clima,
      "riscos" => riscos,
      "idade" => idade,
      "facts" => facts,
      "card_json" => card_json,
      "image_paths" => image_paths,
      "pontos_count" => Integer.to_string(Xray.pontos_count()),
      "pt_rules" => pt_rules
    })
  end

  def hermes_global_instructions do
    compile_step("hermes/global-instructions", %{})
  end

  def for_step(step_module, bundle, address, opts) do
    case step_module do
      MinhaCasaAi.PropertyAnalyses.HermesSteps.Clima ->
        clima(bundle, address)

      MinhaCasaAi.PropertyAnalyses.HermesSteps.Riscos ->
        riscos(bundle, address)

      MinhaCasaAi.PropertyAnalyses.HermesSteps.Mercado ->
        mercado(bundle, address)

      MinhaCasaAi.PropertyAnalyses.HermesSteps.Ambientes ->
        ambientes(bundle)

      MinhaCasaAi.PropertyAnalyses.HermesSteps.Idade ->
        idade(bundle, address, opts)

      _ ->
        {"", %{name: "unknown", version: 0}}
    end
  end

  defp compile_step(name, vars) do
    case Prompts.compile(name, vars) do
      {:ok, text, ref} ->
        {text, ref}

      {:error, _} ->
        fallback_compile(name, vars)
    end
  end

  defp fallback_compile(name, vars) do
    alias MinhaCasaAi.Integrations.Langfuse.PromptDefinitions

    case PromptDefinitions.get(name) do
      %{"prompt" => template} ->
        text = Prompts.compile_template(template, stringify_vars(vars))
        {text, %{name: name, version: 0}}

      _ ->
        {"", %{name: name, version: 0}}
    end
  end

  defp stringify_vars(vars) do
    Map.new(vars, fn {k, v} -> {to_string(k), if(is_binary(v), do: v, else: to_string(v))} end)
  end

  defp facts_line(bundle) do
    case Step.facts_text(bundle) do
      nil -> ""
      text -> "Dados do anúncio: #{text}"
    end
  end
end
