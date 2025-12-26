"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { InfoCircledIcon } from "@radix-ui/react-icons"
import { useMemo, useState } from "react"

import {
  ImovelCompradorParameterCard,
  AmortizacaoParameterCard,
  FiltrosCenarioCard,
  ImovelParameterCard,
  RecursosParameterCard,
} from "./parameter-card"
import {
  ResultsTable,
  SummaryComparison,
  AmortizationSampleTable,
} from "./results-table"
import {
  ScenarioCard,
  ScenarioCardCompact,
} from "./scenario-card"
import { FormulaBreakdown } from "./formula-breakdown"
import { SettingsButton, SettingsPanel } from "./settings-panel"
import {
  DEFAULTS,
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  gerarMatrizCenarios,
  generateTooltips,
  type CenarioCompleto,
} from "./utils/calculations"
import { useSettings } from "./utils/settings"

// ============================================================================
// TYPES
// ============================================================================

// Percentage multipliers for filter options
export const PERCENTAGE_OPTIONS = [
  { value: 1.0, label: "Original" },
  { value: 0.95, label: "-5%" },
  { value: 0.90, label: "-10%" },
  { value: 0.85, label: "-15%" },
  { value: 0.80, label: "-20%" },
] as const

export interface SimulatorParams {
  // Imóvel
  valorImovelSelecionado: number
  taxaAnual: number
  trMensal: number
  prazoMeses: number

  // Recursos
  capitalDisponivel: number
  reservaEmergencia: number

  // Imóvel do Comprador (antigo Apartamento)
  valorApartamentoSelecionado: number
  haircut: number
  custoCondominioMensal: number

  // Amortização
  aporteExtra: number
  rendaMensal: number
  seguros: number

  // Filtros (now store percentage multipliers instead of absolute values)
  valoresImovelFiltroMultipliers: number[]
  valoresAptoFiltroMultipliers: number[]
  estrategiasFiltro: ("permuta" | "venda_posterior")[]

  // Base values and multipliers for slider support (10% to 200%)
  valorImovelBase: number
  valorImovelMultiplier: number
  capitalDisponivelBase: number
  capitalDisponivelMultiplier: number
  reservaEmergenciaBase: number
  reservaEmergenciaMultiplier: number
  valorApartamentoBase: number
  valorApartamentoMultiplier: number
  custoCondominioBase: number
  custoCondominioMultiplier: number
  segurosBase: number
  segurosMultiplier: number
  prazoMesesBase: number
  prazoMesesMultiplier: number
}

interface InfoCardProps {
  title: string
  value: string
  subtitle?: string
  tooltip?: string
  icon?: string
  highlight?: boolean
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Info card com tooltip
 */
const InfoCard = ({ title, value, subtitle, tooltip, icon, highlight }: InfoCardProps) => {
  return (
    <Card
      className={cn(
        "bg-eerieBlack border-brightGrey",
        highlight && "border-primary bg-primary/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {icon && <span className="text-lg">{icon}</span>}
              <span className="text-xs text-ashGray">{title}</span>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoCircledIcon className="h-3 w-3 text-dimGray hover:text-primary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p
              className={cn(
                "text-xl font-bold font-mono",
                highlight ? "text-primary" : "text-white"
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-dimGray mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Componente principal do simulador
 */
export const SimulatorClient = () => {
  // Settings from context
  const { settings, isLoaded } = useSettings()

  // Estado dos parâmetros
  const [params, setParams] = useState<SimulatorParams>({
    // Imóvel
    valorImovelSelecionado: DEFAULTS.valoresImovel[0],
    taxaAnual: DEFAULTS.taxaAnual,
    trMensal: DEFAULTS.trMensal,
    prazoMeses: DEFAULTS.prazoMeses,

    // Recursos
    capitalDisponivel: DEFAULTS.capitalDisponivel,
    reservaEmergencia: DEFAULTS.reservaEmergencia,

    // Imóvel do Comprador (antigo Apartamento)
    valorApartamentoSelecionado: DEFAULTS.valoresApartamento[0],
    haircut: DEFAULTS.haircut,
    custoCondominioMensal: DEFAULTS.custoCondominioMensal,

    // Amortização
    aporteExtra: DEFAULTS.aporteExtra,
    rendaMensal: DEFAULTS.rendaMensal,
    seguros: DEFAULTS.seguros,

    // Filtros (percentage multipliers - Original and -5% selected by default)
    valoresImovelFiltroMultipliers: [1.0, 0.95], // Original and -5%
    valoresAptoFiltroMultipliers: [1.0, 0.95], // Original and -5%
    estrategiasFiltro: ["permuta", "venda_posterior"],

    // Base values and multipliers for slider support (10% to 200%)
    valorImovelBase: DEFAULTS.valoresImovel[0],
    valorImovelMultiplier: 1.0,
    capitalDisponivelBase: DEFAULTS.capitalDisponivel,
    capitalDisponivelMultiplier: 1.0,
    reservaEmergenciaBase: DEFAULTS.reservaEmergencia,
    reservaEmergenciaMultiplier: 1.0,
    valorApartamentoBase: DEFAULTS.valoresApartamento[0],
    valorApartamentoMultiplier: 1.0,
    custoCondominioBase: DEFAULTS.custoCondominioMensal,
    custoCondominioMultiplier: 1.0,
    segurosBase: DEFAULTS.seguros,
    segurosMultiplier: 1.0,
    prazoMesesBase: DEFAULTS.prazoMeses,
    prazoMesesMultiplier: 1.0,
  })

  // Handlers for value and slider changes
  const handleValueChange = (
    field:
      | "valorImovel"
      | "capitalDisponivel"
      | "reservaEmergencia"
      | "valorApartamento"
      | "custoCondominio"
      | "seguros"
      | "prazoMeses",
    newValue: number
  ) => {
    const baseField = `${field}Base` as keyof SimulatorParams
    const multiplierField = `${field}Multiplier` as keyof SimulatorParams

    setParams((prev) => ({
      ...prev,
      [baseField]: newValue,
      [multiplierField]: 1.0,
    }))
  }

  const handleSliderChange = (
    field:
      | "valorImovel"
      | "capitalDisponivel"
      | "reservaEmergencia"
      | "valorApartamento"
      | "custoCondominio"
      | "seguros"
      | "prazoMeses",
    multiplier: number
  ) => {
    // Clamp multiplier to 0.1 (10%) to 2.0 (200%)
    const clampedMultiplier = Math.max(0.1, Math.min(2.0, multiplier))
    const multiplierField = `${field}Multiplier` as keyof SimulatorParams

    setParams((prev) => ({
      ...prev,
      [multiplierField]: clampedMultiplier,
    }))
  }

  // Compute actual values from base * multiplier (keep in sync)
  const computedParams = useMemo(() => {
    return {
      ...params,
      valorImovelSelecionado: Math.round(
        params.valorImovelBase * params.valorImovelMultiplier
      ),
      capitalDisponivel: Math.round(
        params.capitalDisponivelBase * params.capitalDisponivelMultiplier
      ),
      reservaEmergencia: Math.round(
        params.reservaEmergenciaBase * params.reservaEmergenciaMultiplier
      ),
      valorApartamentoSelecionado: Math.round(
        params.valorApartamentoBase * params.valorApartamentoMultiplier
      ),
      custoCondominioMensal: Math.round(
        params.custoCondominioBase * params.custoCondominioMultiplier
      ),
      seguros: Math.round(params.segurosBase * params.segurosMultiplier),
      prazoMeses: Math.round(
        params.prazoMesesBase * params.prazoMesesMultiplier
      ),
    }
  }, [
    params.valorImovelBase,
    params.valorImovelMultiplier,
    params.capitalDisponivelBase,
    params.capitalDisponivelMultiplier,
    params.reservaEmergenciaBase,
    params.reservaEmergenciaMultiplier,
    params.valorApartamentoBase,
    params.valorApartamentoMultiplier,
    params.custoCondominioBase,
    params.custoCondominioMultiplier,
    params.segurosBase,
    params.segurosMultiplier,
    params.prazoMesesBase,
    params.prazoMesesMultiplier,
    params.taxaAnual,
    params.trMensal,
    params.haircut,
    params.aporteExtra,
    params.rendaMensal,
    params.valoresImovelFiltroMultipliers,
    params.valoresAptoFiltroMultipliers,
    params.estrategiasFiltro,
  ])

  // Estado da view
  const [activeTab, setActiveTab] = useState("table")
  const [selectedCenario, setSelectedCenario] = useState<CenarioCompleto | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Filtered values based on selected multipliers
  const valoresImovelFiltrados = useMemo(() => {
    return params.valoresImovelFiltroMultipliers.map((m) =>
      Math.round(computedParams.valorImovelSelecionado * m)
    )
  }, [computedParams.valorImovelSelecionado, params.valoresImovelFiltroMultipliers])

  const valoresAptoFiltrados = useMemo(() => {
    return params.valoresAptoFiltroMultipliers.map((m) =>
      Math.round(computedParams.valorApartamentoSelecionado * m)
    )
  }, [computedParams.valorApartamentoSelecionado, params.valoresAptoFiltroMultipliers])

  // Gerar todos os cenários using filtered values
  const cenarios = useMemo(() => {
    return gerarMatrizCenarios({
      valoresImovel: valoresImovelFiltrados,
      valoresApartamento: valoresAptoFiltrados,
      capitalDisponivel: computedParams.capitalDisponivel,
      reservaEmergencia: computedParams.reservaEmergencia,
      haircut: computedParams.haircut,
      taxaAnual: computedParams.taxaAnual,
      trMensal: computedParams.trMensal,
      prazoMeses: computedParams.prazoMeses,
      aporteExtra: computedParams.aporteExtra,
      rendaMensal: computedParams.rendaMensal,
      custoCondominioMensal: computedParams.custoCondominioMensal,
      seguros: computedParams.seguros,
    })
  }, [
    valoresImovelFiltrados,
    valoresAptoFiltrados,
    computedParams.capitalDisponivel,
    computedParams.reservaEmergencia,
    computedParams.haircut,
    computedParams.taxaAnual,
    computedParams.trMensal,
    computedParams.prazoMeses,
    computedParams.aporteExtra,
    computedParams.rendaMensal,
    computedParams.custoCondominioMensal,
    computedParams.seguros,
  ])

  // Filtrar cenários baseado nos filtros ativos (only strategy filter now, values are pre-filtered)
  const filteredCenarios = useMemo(() => {
    return cenarios.filter((c) => {
      const estrategiaMatch = params.estrategiasFiltro.includes(c.estrategia)
      return estrategiaMatch
    })
  }, [cenarios, params.estrategiasFiltro])

  // Melhor cenário dos filtrados
  const bestCenario = filteredCenarios.find((c) => c.isBest) || filteredCenarios[0]

  // Taxa efetiva mensal e CET usando settings
  const taxaMensalEfetiva = computedParams.taxaAnual / 12 + computedParams.trMensal
  const cetEstimado = computedParams.taxaAnual + computedParams.trMensal * 12 + settings.cetAdditionalCost

  // Generate dynamic tooltips based on current params and settings
  const tooltips = useMemo(() => {
    return generateTooltips({
      reservaEmergencia: computedParams.reservaEmergencia,
      haircut: computedParams.haircut,
      haircutRange: settings.sliders.haircut,
      taxaAnualRange: settings.sliders.taxaAnual,
      trMensalRange: settings.sliders.trMensal,
      prazoOptions: settings.prazoOptions,
      aporteExtra: computedParams.aporteExtra,
      economiaJuros: bestCenario?.economiaJuros,
      aporteExtraRange: settings.sliders.aporteExtra,
      rendaMensalRange: settings.sliders.rendaMensal,
    })
  }, [
    computedParams.reservaEmergencia,
    computedParams.haircut,
    computedParams.aporteExtra,
    settings.sliders.haircut,
    settings.sliders.taxaAnual,
    settings.sliders.trMensal,
    settings.sliders.aporteExtra,
    settings.sliders.rendaMensal,
    settings.prazoOptions,
    bestCenario?.economiaJuros,
  ])

  // Show loading state until settings are loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-ashGray">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-brightGrey bg-raisinBlack">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">
                🏠 Simulador de Financiamento Imobiliário
              </h1>
              <p className="text-ashGray">
                Sistema SAC com análise completa de cenários, amortização acelerada
                e estratégias de permuta vs venda posterior
              </p>
            </div>
            <SettingsButton onClick={() => setShowSettings(true)} />
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Info cards rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard
            title="Taxa Efetiva Mensal"
            value={formatPercent(taxaMensalEfetiva)}
            subtitle={`Juros ${formatPercent(computedParams.taxaAnual)} + TR ${formatPercent(computedParams.trMensal)}`}
            tooltip={tooltips.trMensal}
            icon="📊"
          />
          <InfoCard
            title="CET Estimado"
            value={`${formatPercent(cetEstimado)} a.a.`}
            subtitle="Custo Efetivo Total"
            tooltip={tooltips.cetEstimado}
            icon="💹"
            highlight
          />
          <InfoCard
            title="Entrada Disponível"
            value={formatCurrency(
              computedParams.capitalDisponivel - computedParams.reservaEmergencia
            )}
            subtitle={`De ${formatCurrency(computedParams.capitalDisponivel)} total`}
            tooltip={tooltips.reservaEmergencia}
            icon="💰"
          />
          <InfoCard
            title="Cenários Analisados"
            value={`${filteredCenarios.length} de ${cenarios.length}`}
            subtitle={`${filteredCenarios.filter((c) => c.comprometimento.dentroDoLimite).length} dentro do limite de renda`}
            tooltip="Número de combinações calculadas"
            icon="🎯"
          />
        </div>

        {/* Painel de configuração */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <ImovelParameterCard
            params={{ ...params, ...computedParams }}
            onChange={setParams}
            onValueChange={handleValueChange}
            onSliderChange={handleSliderChange}
          />
          <RecursosParameterCard
            params={{ ...params, ...computedParams }}
            onChange={setParams}
            onValueChange={handleValueChange}
            onSliderChange={handleSliderChange}
          />
          <ImovelCompradorParameterCard
            params={{ ...params, ...computedParams }}
            onChange={setParams}
            onValueChange={handleValueChange}
            onSliderChange={handleSliderChange}
          />
          <AmortizacaoParameterCard
            params={{ ...params, ...computedParams }}
            onChange={setParams}
            onValueChange={handleValueChange}
            onSliderChange={handleSliderChange}
          />
        </div>

        {/* Resumo comparativo */}
        <Card className="bg-raisinBlack border-brightGrey">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">📈 Resumo dos Cenários</CardTitle>
          </CardHeader>
          <CardContent>
            <SummaryComparison cenarios={filteredCenarios} />
          </CardContent>
        </Card>

        {/* Filtros */}
        <FiltrosCenarioCard params={{ ...params, ...computedParams }} onChange={setParams} />

        {/* Tabs de visualização */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="table">📋 Tabela Comparativa</TabsTrigger>
            <TabsTrigger value="grid">📊 Grid de Cenários</TabsTrigger>
            <TabsTrigger value="detail">🔍 Detalhes</TabsTrigger>
          </TabsList>

          {/* Table View */}
          <TabsContent value="table">
            <Card className="bg-raisinBlack border-brightGrey">
              <CardContent className="p-0">
                <ResultsTable
                  cenarios={filteredCenarios}
                  onSelectCenario={(cenario) => {
                    setSelectedCenario(cenario)
                    setActiveTab("detail")
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grid View */}
          <TabsContent value="grid">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCenarios.map((cenario) => (
                <ScenarioCardCompact
                  key={cenario.id}
                  cenario={cenario}
                  onClick={() => {
                    setSelectedCenario(cenario)
                    setActiveTab("detail")
                  }}
                />
              ))}
            </div>
          </TabsContent>

          {/* Detail View */}
          <TabsContent value="detail">
            {selectedCenario ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">
                    Detalhes do Cenário Selecionado
                  </h3>
                  <button
                    onClick={() => setSelectedCenario(null)}
                    className="text-xs text-ashGray hover:text-primary transition-colors"
                  >
                    Limpar seleção
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <ScenarioCard cenario={selectedCenario} isExpanded />

                  {/* Formula breakdown panel */}
                  <FormulaBreakdown cenario={selectedCenario} />

                  {/* Tabela de amortização amostra */}
                  <Card className="bg-eerieBlack border-brightGrey lg:col-span-2 xl:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-base">
                        📅 Evolução das Parcelas (Amostra)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AmortizationSampleTable
                        parcelas={selectedCenario.parcelasAmostra}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="bg-eerieBlack border-brightGrey">
                <CardContent className="py-12 text-center">
                  <p className="text-ashGray">
                    Selecione um cenário no Grid ou na Tabela para ver os
                    detalhes completos.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Informações educativas */}
        <Card className="bg-raisinBlack border-brightGrey">
          <CardHeader>
            <CardTitle className="text-lg">📚 Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-ashGray">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-primary font-semibold">Sistema SAC</h4>
                <p>
                  No Sistema de Amortização Constante (SAC), a amortização é
                  fixa e os juros são calculados sobre o saldo devedor
                  decrescente. Resultado: parcelas decrescentes ao longo do
                  tempo.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-primary font-semibold">Amortização Extra</h4>
                <p>
                  SEMPRE escolha &quot;Reduzir Prazo&quot; ao amortizar. Isso maximiza a
                  economia de juros. Com aportes de {formatCurrency(computedParams.aporteExtra)}/mês você pode
                  economizar {bestCenario ? formatCurrencyCompact(bestCenario.economiaJuros) : "significativamente"} em juros!
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-salmon font-semibold">Permuta vs Venda</h4>
                <p>
                  A permuta tem deságio (haircut) de {settings.sliders.haircut.min}-{settings.sliders.haircut.max}%. A venda posterior
                  permite vender pelo preço de mercado e usar a Lei do Bem
                  (isenção de IR se usado para amortizar em 180 dias).
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-green font-semibold">SFH 2025</h4>
                <p>
                  Novo teto do SFH: R$ 2,25 milhões. Imóveis dentro deste limite
                  têm taxas reguladas, possibilidade de uso do FGTS e desconto
                  no ITBI em Florianópolis.
                </p>
              </div>
            </div>

            <div className="border-t border-brightGrey pt-4 mt-4">
              <h4 className="text-primary font-semibold mb-2">
                Documentação PJ (Lucro Presumido)
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>DIRPF completa com distribuição de lucros no campo &quot;Rendimentos Isentos&quot;</li>
                <li>Extratos bancários PF (6-12 meses) mostrando entradas da PJ</li>
                <li>Balancetes/ECF da empresa assinados por contador CRC</li>
                <li>DECORE (peso menor que IRPF, usar se renda atual &gt; declarada)</li>
                <li>Concentrar liquidez no banco 30-60 dias antes para melhorar rating</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-xs text-dimGray py-6 border-t border-brightGrey">
          <p>
            Simulador de financiamento para fins educacionais. Consulte um
            profissional antes de tomar decisões financeiras.
          </p>
          <p className="mt-1">
            Dados baseados em condições de mercado de Dezembro de 2025.
          </p>
        </footer>
      </main>
    </div>
  )
}
