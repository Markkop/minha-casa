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
  BestScenarioCard,
  ScenarioCard,
  ScenarioCardCompact,
} from "./scenario-card"
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

  // Filtros
  valoresImovelFiltro: number[]
  valoresAptoFiltro: number[]
  estrategiasFiltro: ("permuta" | "venda_posterior")[]
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

    // Filtros
    valoresImovelFiltro: [...DEFAULTS.valoresImovel],
    valoresAptoFiltro: [...DEFAULTS.valoresApartamento],
    estrategiasFiltro: ["permuta", "venda_posterior"],
  })

  // Estado da view
  const [activeTab, setActiveTab] = useState("table")
  const [selectedCenario, setSelectedCenario] = useState<CenarioCompleto | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Get property values from settings
  const valoresImovelCasa = settings.valoresImovelCasa
  const valoresImovelComprador = settings.valoresImovelComprador

  // Gerar todos os cenários
  const cenarios = useMemo(() => {
    return gerarMatrizCenarios({
      valoresImovel: valoresImovelCasa,
      valoresApartamento: valoresImovelComprador,
      capitalDisponivel: params.capitalDisponivel,
      reservaEmergencia: params.reservaEmergencia,
      haircut: params.haircut,
      taxaAnual: params.taxaAnual,
      trMensal: params.trMensal,
      prazoMeses: params.prazoMeses,
      aporteExtra: params.aporteExtra,
      rendaMensal: params.rendaMensal,
      custoCondominioMensal: params.custoCondominioMensal,
      seguros: params.seguros,
    })
  }, [
    valoresImovelCasa,
    valoresImovelComprador,
    params.capitalDisponivel,
    params.reservaEmergencia,
    params.haircut,
    params.taxaAnual,
    params.trMensal,
    params.prazoMeses,
    params.aporteExtra,
    params.rendaMensal,
    params.custoCondominioMensal,
    params.seguros,
  ])

  // Filtrar cenários baseado nos filtros ativos
  const filteredCenarios = useMemo(() => {
    return cenarios.filter((c) => {
      const imovelMatch = params.valoresImovelFiltro.includes(c.valorImovel)
      const aptoMatch = params.valoresAptoFiltro.includes(c.valorApartamento)
      const estrategiaMatch = params.estrategiasFiltro.includes(c.estrategia)
      return imovelMatch && aptoMatch && estrategiaMatch
    })
  }, [
    cenarios,
    params.valoresImovelFiltro,
    params.valoresAptoFiltro,
    params.estrategiasFiltro,
  ])

  // Melhor cenário dos filtrados
  const bestCenario = filteredCenarios.find((c) => c.isBest) || filteredCenarios[0]

  // Taxa efetiva mensal e CET usando settings
  const taxaMensalEfetiva = params.taxaAnual / 12 + params.trMensal
  const cetEstimado = params.taxaAnual + params.trMensal * 12 + settings.cetAdditionalCost

  // Generate dynamic tooltips based on current params and settings
  const tooltips = useMemo(() => {
    return generateTooltips({
      reservaEmergencia: params.reservaEmergencia,
      haircut: params.haircut,
      haircutRange: settings.sliders.haircut,
      taxaAnualRange: settings.sliders.taxaAnual,
      trMensalRange: settings.sliders.trMensal,
      prazoOptions: settings.prazoOptions,
      aporteExtra: params.aporteExtra,
      economiaJuros: bestCenario?.economiaJuros,
      aporteExtraRange: settings.sliders.aporteExtra,
      rendaMensalRange: settings.sliders.rendaMensal,
    })
  }, [
    params.reservaEmergencia,
    params.haircut,
    params.aporteExtra,
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
            subtitle={`Juros ${formatPercent(params.taxaAnual)} + TR ${formatPercent(params.trMensal)}`}
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
              params.capitalDisponivel - params.reservaEmergencia
            )}
            subtitle={`De ${formatCurrency(params.capitalDisponivel)} total`}
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
          <ImovelParameterCard params={params} onChange={setParams} />
          <RecursosParameterCard params={params} onChange={setParams} />
          <ImovelCompradorParameterCard params={params} onChange={setParams} />
          <AmortizacaoParameterCard params={params} onChange={setParams} />
        </div>

        {/* Filtros */}
        <FiltrosCenarioCard params={params} onChange={setParams} />

        {/* Resumo comparativo */}
        <Card className="bg-raisinBlack border-brightGrey">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">📈 Resumo dos Cenários</CardTitle>
          </CardHeader>
          <CardContent>
            <SummaryComparison cenarios={filteredCenarios} />
          </CardContent>
        </Card>

        {/* Melhor cenário em destaque */}
        {bestCenario && <BestScenarioCard cenario={bestCenario} />}

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ScenarioCard cenario={selectedCenario} isExpanded />

                  {/* Tabela de amortização amostra */}
                  <Card className="bg-eerieBlack border-brightGrey">
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
                  economia de juros. Com aportes de {formatCurrency(params.aporteExtra)}/mês você pode
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
