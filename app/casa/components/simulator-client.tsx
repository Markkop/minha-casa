"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMemo, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

import { AdjustmentPanel, FiltrosCenarioCard } from "./parameter-card"
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
import {
  PageToolbar,
  PageToolbarEnd,
} from "@/app/components/page-toolbar"
import {
  WORKSPACE_CONTENT_CLASS,
  WORKSPACE_STACK_CLASS,
  WorkspaceLoadingState,
} from "@/app/components/workspace-ui"
import { SettingsButton, SettingsPanel } from "./settings-panel"
import {
  DEFAULTS,
  calcularReservaRecomendada,
  clampReservaAoTeto,
  formatCurrency,
  formatCurrencyCompact,
  gerarMatrizCenarios,
  inferReservaTetoRatio,
  syncRecursosFromEntradaDesejada,
  syncRecursosMesh,
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

  /** Fração (0–1) do teto de reserva recomendada que o usuário mantém. */
  reservaTetoRatio: number
}

type RecursosMeshOptions = {
  capitalDisponivel?: number
  valorImovel?: number
  reservaTetoRatio?: number
  entradaDesejada?: number
  reservaDesejada?: number
}

const readCapital = (p: SimulatorParams) =>
  Math.round(p.capitalDisponivelBase * p.capitalDisponivelMultiplier)

const readValorImovel = (p: SimulatorParams) =>
  Math.round(p.valorImovelBase * p.valorImovelMultiplier)

const applyRecursosMesh = (
  prev: SimulatorParams,
  options: RecursosMeshOptions
): SimulatorParams => {
  const capital = options.capitalDisponivel ?? readCapital(prev)
  const valorImovel = options.valorImovel ?? readValorImovel(prev)

  let ratio = options.reservaTetoRatio ?? prev.reservaTetoRatio ?? 1

  if (options.entradaDesejada !== undefined) {
    const fromEntrada = syncRecursosFromEntradaDesejada(
      capital,
      valorImovel,
      options.entradaDesejada
    )
    return {
      ...prev,
      capitalDisponivelBase: fromEntrada.capitalDisponivel,
      capitalDisponivelMultiplier: 1.0,
      reservaEmergenciaBase: fromEntrada.reservaEmergencia,
      reservaEmergenciaMultiplier: 1.0,
      reservaTetoRatio: fromEntrada.reservaTetoRatio,
      ...(options.valorImovel !== undefined
        ? { valorImovelBase: valorImovel, valorImovelMultiplier: 1.0 }
        : {}),
    }
  }

  if (options.reservaDesejada !== undefined) {
    const clamped = clampReservaAoTeto(options.reservaDesejada, capital, valorImovel)
    ratio = inferReservaTetoRatio(clamped, capital, valorImovel)
  }

  const mesh = syncRecursosMesh({
    capitalDisponivel: capital,
    valorImovel,
    reservaTetoRatio: ratio,
  })

  return {
    ...prev,
    capitalDisponivelBase: capital,
    capitalDisponivelMultiplier: 1.0,
    reservaEmergenciaBase: mesh.reservaEmergencia,
    reservaEmergenciaMultiplier: 1.0,
    reservaTetoRatio: mesh.reservaTetoRatio,
    ...(options.valorImovel !== undefined
      ? { valorImovelBase: valorImovel, valorImovelMultiplier: 1.0 }
      : {}),
  }
}

const initialValorImovel = DEFAULTS.valoresImovel[0]
const initialReservaMesh = syncRecursosMesh({
  capitalDisponivel: DEFAULTS.capitalDisponivel,
  valorImovel: initialValorImovel,
  reservaTetoRatio: inferReservaTetoRatio(
    DEFAULTS.reservaEmergencia,
    DEFAULTS.capitalDisponivel,
    initialValorImovel
  ),
})

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Componente principal do simulador
 */
export const SimulatorClient = () => {
  // Settings from context
  const { settings, isLoaded } = useSettings()
  const searchParams = useSearchParams()

  // Refresh subscription cookie on mount to ensure it's up-to-date
  useEffect(() => {
    // Call the subscriptions API to refresh the cookie
    // This ensures the middleware has the correct subscription status
    fetch("/api/subscriptions", {
      method: "GET",
      credentials: "include",
    }).catch((error) => {
      // Silently fail - if there's an error, the middleware will handle it
      console.error("Failed to refresh subscription cookie:", error)
    })
  }, [])

  // Estado dos parâmetros
  const [params, setParams] = useState<SimulatorParams>({
    // Imóvel
    valorImovelSelecionado: DEFAULTS.valoresImovel[0],
    taxaAnual: DEFAULTS.taxaAnual,
    trMensal: DEFAULTS.trMensal,
    prazoMeses: DEFAULTS.prazoMeses,

    // Recursos
    capitalDisponivel: DEFAULTS.capitalDisponivel,
    reservaEmergencia: initialReservaMesh.reservaEmergencia,

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
    reservaEmergenciaBase: initialReservaMesh.reservaEmergencia,
    reservaEmergenciaMultiplier: 1.0,
    reservaTetoRatio: initialReservaMesh.reservaTetoRatio,
    valorApartamentoBase: DEFAULTS.valoresApartamento[0],
    valorApartamentoMultiplier: 1.0,
    custoCondominioBase: DEFAULTS.custoCondominioMensal,
    custoCondominioMultiplier: 1.0,
    segurosBase: DEFAULTS.seguros,
    segurosMultiplier: 1.0,
    prazoMesesBase: DEFAULTS.prazoMeses,
    prazoMesesMultiplier: 1.0,
  })

  // Read price from URL parameter on mount
  useEffect(() => {
    const priceParam = searchParams.get("price")
    if (priceParam) {
      const price = parseFloat(priceParam)
      if (!isNaN(price) && price > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time URL parameter initialization
        setParams((prev) =>
          applyRecursosMesh(
            { ...prev, valorImovelBase: price, valorImovelMultiplier: 1.0 },
            { valorImovel: price }
          )
        )
        // Clean up URL parameter after reading
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          url.searchParams.delete("price")
          window.history.replaceState({}, "", url.toString())
        }
      }
    }
  }, [searchParams])

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
    if (field === "capitalDisponivel") {
      setParams((prev) => applyRecursosMesh(prev, { capitalDisponivel: newValue }))
      return
    }
    if (field === "reservaEmergencia") {
      setParams((prev) => applyRecursosMesh(prev, { reservaDesejada: newValue }))
      return
    }
    if (field === "valorImovel") {
      setParams((prev) => applyRecursosMesh(prev, { valorImovel: newValue }))
      return
    }

    const baseField = `${field}Base` as keyof SimulatorParams
    const multiplierField = `${field}Multiplier` as keyof SimulatorParams

    setParams((prev) => ({
      ...prev,
      [baseField]: newValue,
      [multiplierField]: 1.0,
    }))
  }

  const handleCapitalChange = (newCapital: number) => {
    setParams((prev) => {
      const valorImovel = readValorImovel(prev)
      const { valor: reservaRec } = calcularReservaRecomendada(valorImovel)
      const max = Math.max(
        Math.round(valorImovel * 0.75),
        reservaRec * 10,
        DEFAULTS.capitalDisponivel * 3
      )
      return applyRecursosMesh(prev, {
        capitalDisponivel: Math.max(0, Math.min(Math.round(newCapital), max)),
      })
    })
  }

  const handleSliderChange = (
    field:
      | "valorImovel"
      | "valorApartamento"
      | "custoCondominio"
      | "seguros"
      | "prazoMeses",
    multiplier: number
  ) => {
    const clampedMultiplier = Math.max(0.1, Math.min(2.0, multiplier))

    if (field === "valorImovel") {
      setParams((prev) => {
        const valorImovel = Math.round(prev.valorImovelBase * clampedMultiplier)
        return applyRecursosMesh(
          { ...prev, valorImovelMultiplier: clampedMultiplier },
          { valorImovel }
        )
      })
      return
    }

    const multiplierField = `${field}Multiplier` as keyof SimulatorParams
    setParams((prev) => ({
      ...prev,
      [multiplierField]: clampedMultiplier,
    }))
  }

  const handleReservaChange = (newReserva: number) => {
    setParams((prev) => applyRecursosMesh(prev, { reservaDesejada: newReserva }))
  }

  const handleEntradaChange = (newEntrada: number) => {
    setParams((prev) => applyRecursosMesh(prev, { entradaDesejada: newEntrada }))
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
  }, [params])

  const recursosMeta = useMemo(() => {
    const valorImovel = computedParams.valorImovelSelecionado
    const { pct, valor: reservaRecomendada } = calcularReservaRecomendada(valorImovel)
    const reservaTeto = Math.min(
      reservaRecomendada,
      computedParams.capitalDisponivel
    )
    // Faixa estável: só recalcula quando o imóvel muda (não quando o capital muda)
    const capitalMax = Math.max(
      Math.round(valorImovel * 0.75),
      reservaRecomendada * 10,
      DEFAULTS.capitalDisponivel * 3
    )
    return {
      reservaRecomendada,
      reservaPctRecomendado: pct,
      reservaTeto,
      capitalSlider: {
        min: 0,
        max: capitalMax,
        step: 10_000,
      },
    }
  }, [computedParams.valorImovelSelecionado, computedParams.capitalDisponivel])

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

  // Show loading state until settings are loaded
  if (!isLoaded) {
    return <WorkspaceLoadingState />
  }

  return (
    <div className="min-h-[calc(100vh-var(--nav-height,2.75rem))] bg-app-bg text-app-fg">
      <PageToolbar>
        <PageToolbarEnd className="w-full">
          <SettingsButton onClick={() => setShowSettings(true)} />
        </PageToolbarEnd>
      </PageToolbar>

      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <main className={`${WORKSPACE_CONTENT_CLASS} ${WORKSPACE_STACK_CLASS}`}>
        <AdjustmentPanel
          params={{ ...params, ...computedParams }}
          recursosMeta={recursosMeta}
          onChange={setParams}
          onValueChange={handleValueChange}
          onSliderChange={handleSliderChange}
          onCapitalChange={handleCapitalChange}
          onReservaChange={handleReservaChange}
          onEntradaChange={handleEntradaChange}
        />

        {/* Resumo comparativo */}
        <Card className="bg-app-surface border-app-border">
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
            <Card className="bg-app-surface border-app-border">
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
                  <h3 className="text-lg font-semibold text-app-accent">
                    Detalhes do Cenário Selecionado
                  </h3>
                  <button
                    onClick={() => setSelectedCenario(null)}
                    className="text-xs text-app-muted hover:text-app-accent transition-colors"
                  >
                    Limpar seleção
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <ScenarioCard cenario={selectedCenario} isExpanded />

                  {/* Formula breakdown panel */}
                  <FormulaBreakdown cenario={selectedCenario} />

                  {/* Tabela de amortização amostra */}
                  <Card className="bg-app-surface-muted border-app-border lg:col-span-2 xl:col-span-1">
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
              <Card className="bg-app-surface-muted border-app-border">
                <CardContent className="py-12 text-center">
                  <p className="text-app-muted">
                    Selecione um cenário no Grid ou na Tabela para ver os
                    detalhes completos.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Informações educativas */}
        <Card className="bg-app-surface border-app-border">
          <CardHeader>
            <CardTitle className="text-lg">📚 Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-app-muted">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-app-accent font-semibold">Sistema SAC</h4>
                <p>
                  No Sistema de Amortização Constante (SAC), a amortização é
                  fixa e os juros são calculados sobre o saldo devedor
                  decrescente. Resultado: parcelas decrescentes ao longo do
                  tempo.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-app-accent font-semibold">Amortização Extra</h4>
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

            <div className="border-t border-app-border pt-4 mt-4">
              <h4 className="text-app-accent font-semibold mb-2">
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
        <footer className="text-center text-xs text-app-subtle py-6 border-t border-app-border">
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
