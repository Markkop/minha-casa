"use client"

import React, { useState, useMemo, useEffect, startTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ArrowDownIcon, ArrowUpIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import {
  gerarMatrizCenarios,
  formatCurrency,
  formatCurrencyCompact,
  type CenarioCompleto,
} from "@/app/casa/components/utils/calculations"

// Format currency with one decimal K (e.g., "R$ 12.5k")
const formatCurrencyK = (value: number): string => {
  return `R$ ${(value / 1000).toFixed(1)}k`
}

// Demo defaults
const DEMO_DEFAULTS = {
  valorImovel: 1200000,
  taxaAnual: 0.105,
  trMensal: 0.001,
  prazoMeses: 360,
  capitalDisponivel: 500000,
  valorApartamento: 550000,
  haircut: 0.15, // Fixed at 15%
  aporteExtra: 2000,
  rendaMensal: 30000,
  seguros: 175,
  custoCondominioMensal: 1000,
}

// Multiplier options
const PERCENTAGE_OPTIONS = [
  { value: 1.0, label: "Original" },
  { value: 0.95, label: "-5%" },
  { value: 0.90, label: "-10%" },
] as const


type Estrategia = "permuta" | "venda_posterior"

// Sorting types
type SortKey =
  | "valorImovel"
  | "valorApartamento"
  | "valorFinanciado"
  | "totalMes"
  | "comprometimento"
  | "prazoReal"
  | "jurosOtimizado"
  | "custoTotal"

type SortDirection = "asc" | "desc"

interface SortState {
  key: SortKey
  direction: SortDirection
}

// Currency input
function CurrencyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())
  const prevValueRef = React.useRef(value)

  useEffect(() => {
    if (!isFocused && prevValueRef.current !== value) {
      prevValueRef.current = value
      startTransition(() => {
        setInputValue(value.toString())
      })
    }
  }, [value, isFocused])

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={isFocused ? inputValue : formatCurrency(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "")
        setInputValue(raw)
        onChange(parseInt(raw, 10) || 0)
      }}
      onFocus={() => { setIsFocused(true); setInputValue(value.toString()) }}
      onBlur={() => setIsFocused(false)}
      className="font-mono h-8 text-sm"
    />
  )
}

// Percent input
function PercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState((value * 100).toFixed(2))
  const prevValueRef = React.useRef(value)

  useEffect(() => {
    if (!isFocused && prevValueRef.current !== value) {
      prevValueRef.current = value
      startTransition(() => {
        setInputValue((value * 100).toFixed(2))
      })
    }
  }, [value, isFocused])

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={isFocused ? inputValue : `${(value * 100).toFixed(2)}%`}
      onChange={(e) => {
        const clean = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".")
        setInputValue(clean)
        onChange((parseFloat(clean) || 0) / 100)
      }}
      onFocus={() => { setIsFocused(true); setInputValue((value * 100).toFixed(2)) }}
      onBlur={() => setIsFocused(false)}
      className="font-mono h-8 text-sm"
    />
  )
}

// Sortable header component
function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = "left",
}: {
  label: string
  sortKey: SortKey
  currentSort: SortState
  onSort: (key: SortKey) => void
  align?: "left" | "right"
}) {
  const isActive = currentSort.key === sortKey
  const isAsc = isActive && currentSort.direction === "asc"

  return (
    <th
      className={cn(
        "px-3 py-2 text-xs font-medium text-ashGray cursor-pointer hover:bg-middleGray/30 transition-colors",
        align === "right" ? "text-right" : "text-left"
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn("flex items-center gap-1", align === "right" && "justify-end")}>
        <span>{label}</span>
        {isActive && (
          isAsc ? (
            <ArrowUpIcon className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-primary" />
          )
        )}
      </div>
    </th>
  )
}

export function DemoFinanciamentoSection() {
  // State
  const [valorImovel, setValorImovel] = useState(DEMO_DEFAULTS.valorImovel)
  const [taxaAnual, setTaxaAnual] = useState(DEMO_DEFAULTS.taxaAnual)
  const [trMensal, setTrMensal] = useState(DEMO_DEFAULTS.trMensal)
  const [capitalDisponivel, setCapitalDisponivel] = useState(DEMO_DEFAULTS.capitalDisponivel)
  const [valorApartamento, setValorApartamento] = useState(DEMO_DEFAULTS.valorApartamento)
  const [aporteExtra, setAporteExtra] = useState(DEMO_DEFAULTS.aporteExtra)

  // Filter states
  const [imovelMultipliers, setImovelMultipliers] = useState<number[]>([1.0])
  const [aptoMultipliers, setAptoMultipliers] = useState<number[]>([1.0])
  const [estrategias, setEstrategias] = useState<Estrategia[]>(["permuta", "venda_posterior"])

  // Sort state
  const [sort, setSort] = useState<SortState>({ key: "jurosOtimizado", direction: "asc" })

  const handleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }))
  }

  // Generate scenarios
  const cenarios = useMemo(() => {
    const valoresImovel = imovelMultipliers.map(m => Math.round(valorImovel * m))
    const valoresApto = aptoMultipliers.map(m => Math.round(valorApartamento * m))

    return gerarMatrizCenarios({
      valoresImovel,
      valoresApartamento: valoresApto,
      capitalDisponivel,
      reservaEmergencia: 0,
      haircut: DEMO_DEFAULTS.haircut,
      taxaAnual,
      trMensal,
      prazoMeses: DEMO_DEFAULTS.prazoMeses,
      aporteExtra,
      rendaMensal: DEMO_DEFAULTS.rendaMensal,
      custoCondominioMensal: DEMO_DEFAULTS.custoCondominioMensal,
      seguros: DEMO_DEFAULTS.seguros,
    }).filter(c => estrategias.includes(c.estrategia))
  }, [valorImovel, valorApartamento, capitalDisponivel, taxaAnual, trMensal, aporteExtra, imovelMultipliers, aptoMultipliers, estrategias])

  // Sorted scenarios
  const sortedCenarios = useMemo(() => {
    return [...cenarios].sort((a, b) => {
      const getValue = (cenario: CenarioCompleto, key: SortKey): number => {
        const paths: Record<SortKey, number> = {
          valorImovel: cenario.valorImovel,
          valorApartamento: cenario.valorApartamento,
          valorFinanciado: cenario.financiamento.valorFinanciado,
          totalMes: cenario.aporteExtra + cenario.tabelaPadrao.primeiraParcelar,
          comprometimento: cenario.comprometimento.percentual,
          prazoReal: cenario.cenarioOtimizado.prazoReal,
          jurosOtimizado: cenario.cenarioOtimizado.totalJuros,
          custoTotal: cenario.custoTotalOtimizado,
        }
        return paths[key] ?? 0
      }

      const aVal = getValue(a, sort.key)
      const bVal = getValue(b, sort.key)

      return sort.direction === "asc" ? aVal - bVal : bVal - aVal
    })
  }, [cenarios, sort])

  // Toggle helpers
  const toggleImovelMult = (m: number) => {
    setImovelMultipliers(prev => prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m])
  }
  const toggleAptoMult = (m: number) => {
    setAptoMultipliers(prev => prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m])
  }
  const toggleEstrategia = (e: Estrategia) => {
    setEstrategias(prev => prev.includes(e) ? (prev.length > 1 ? prev.filter(x => x !== e) : prev) : [...prev, e])
  }

  return (
    <section className="mt-16 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brightGrey pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🏠</span>
            <span>Simulador de Financiamento</span>
            <span className="px-2 py-1 text-xs rounded-md border inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border-amber-500">
              <span>🚀</span>
              Em Breve
            </span>
          </h2>
          <p className="text-ashGray text-sm">
            Sistema SAC com análise de cenários e estratégias permuta vs venda.
          </p>
        </div>
      </div>

      {/* Parameters and Filters - Combined card */}
      <Card className="bg-eerieBlack border-brightGrey">
        <CardContent className="px-4 pb-4 pt-4">
          <div className="space-y-6">
            {/* Parâmetros - Two column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Column 1: Valor do Imóvel alvo */}
              <div className="space-y-1">
                <Label className="text-xs text-ashGray">Valor do Imóvel alvo</Label>
                <Slider
                  value={[valorImovel]}
                  onValueChange={([v]) => setValorImovel(v)}
                  min={500000}
                  max={3000000}
                  step={50000}
                  className="py-1"
                />
                <CurrencyInput value={valorImovel} onChange={setValorImovel} />
              </div>

              {/* Column 2: Taxa de Juros Anual */}
              <div className="space-y-1">
                <Label className="text-xs text-ashGray">Taxa de Juros Anual</Label>
                <Slider
                  value={[taxaAnual * 100]}
                  onValueChange={([v]) => setTaxaAnual(v / 100)}
                  min={8}
                  max={15}
                  step={0.1}
                  className="py-1"
                />
                <PercentInput value={taxaAnual} onChange={setTaxaAnual} />
              </div>

              {/* Column 1: Imóvel Existente */}
              <div className="space-y-1">
                <Label className="text-xs text-ashGray">Imóvel Existente</Label>
                <Slider
                  value={[valorApartamento]}
                  onValueChange={([v]) => setValorApartamento(v)}
                  min={200000}
                  max={2000000}
                  step={50000}
                  className="py-1"
                />
                <CurrencyInput value={valorApartamento} onChange={setValorApartamento} />
              </div>

              {/* Column 2: TR Mensal */}
              <div className="space-y-1">
                <Label className="text-xs text-ashGray">TR Mensal</Label>
                <Slider
                  value={[trMensal * 100]}
                  onValueChange={([v]) => setTrMensal(v / 100)}
                  min={0}
                  max={0.3}
                  step={0.01}
                  className="py-1"
                />
                <PercentInput value={trMensal} onChange={setTrMensal} />
              </div>

              {/* Column 1: Capital Disponível */}
              <div className="space-y-1">
                <Label className="text-xs text-ashGray">Capital Disponível (Entrada)</Label>
                <Slider
                  value={[capitalDisponivel]}
                  onValueChange={([v]) => setCapitalDisponivel(v)}
                  min={100000}
                  max={2000000}
                  step={50000}
                  className="py-1"
                />
                <CurrencyInput value={capitalDisponivel} onChange={setCapitalDisponivel} />
              </div>

              {/* Column 2: Aporte Extra */}
              <div className="space-y-1">
                <Label className="text-xs text-ashGray">Aporte Extra Mensal</Label>
                <Slider
                  value={[aporteExtra]}
                  onValueChange={([v]) => setAporteExtra(v)}
                  min={0}
                  max={30000}
                  step={500}
                  className="py-1"
                />
                <CurrencyInput value={aporteExtra} onChange={setAporteExtra} />
              </div>
            </div>

            {/* Filtros de Visualização - Below sliders */}
            <div className="space-y-4">
              {/* Simular sections side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Simular com Valores Variados (Imóvel Alvo) */}
                <div className="space-y-2">
                  <Label className="text-xs text-ashGray">Simular com Valores Variados (Imóvel Alvo)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {PERCENTAGE_OPTIONS.map(({ value, label }) => (
                      <button
                        key={`imovel-${value}`}
                        onClick={() => toggleImovelMult(value)}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-md border transition-all flex flex-col items-center gap-0.5",
                          imovelMultipliers.includes(value)
                            ? "bg-primary/20 text-primary border-primary"
                            : "bg-middleGray50 border-brightGrey text-dimGray"
                        )}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-[10px] opacity-75">{formatCurrency(Math.round(valorImovel * value))}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simular com Valores Variados (Imóvel Existente) */}
                <div className="space-y-2">
                  <Label className="text-xs text-ashGray">Simular com Valores Variados (Imóvel Existente)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {PERCENTAGE_OPTIONS.map(({ value, label }) => (
                      <button
                        key={`apto-${value}`}
                        onClick={() => toggleAptoMult(value)}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-md border transition-all flex flex-col items-center gap-0.5",
                          aptoMultipliers.includes(value)
                            ? "bg-salmon/20 text-salmon border-salmon"
                            : "bg-middleGray50 border-brightGrey text-dimGray"
                        )}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-[10px] opacity-75">{formatCurrency(Math.round(valorApartamento * value))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estratégias */}
              <div className="space-y-2">
                <Label className="text-xs text-ashGray">Estratégias</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleEstrategia("permuta")}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md border transition-all",
                      estrategias.includes("permuta")
                        ? "bg-salmon/20 text-salmon border-salmon"
                        : "bg-middleGray50 border-brightGrey text-dimGray"
                    )}
                  >
                    Permuta
                  </button>
                  <button
                    onClick={() => toggleEstrategia("venda_posterior")}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md border transition-all",
                      estrategias.includes("venda_posterior")
                        ? "bg-green/20 text-green border-green"
                        : "bg-middleGray50 border-brightGrey text-dimGray"
                    )}
                  >
                    Venda Posterior
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table - Same columns as original with sorting */}
      <Card className="bg-raisinBlack border-brightGrey">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Tabela Comparativa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brightGrey bg-black/30">
                  <th className="w-8 px-2 py-2"></th>
                  <SortableHeader label="Alvo" sortKey="valorImovel" currentSort={sort} onSort={handleSort} />
                  <SortableHeader label="Apto" sortKey="valorApartamento" currentSort={sort} onSort={handleSort} />
                  <th className="px-3 py-2 text-left text-xs font-medium text-ashGray">Estratégia</th>
                  <SortableHeader label="Financiado" sortKey="valorFinanciado" currentSort={sort} onSort={handleSort} align="right" />
                  <SortableHeader label="Total/mês" sortKey="totalMes" currentSort={sort} onSort={handleSort} align="right" />
                  <SortableHeader label="Prazo" sortKey="prazoReal" currentSort={sort} onSort={handleSort} align="right" />
                  <SortableHeader label="Juros" sortKey="jurosOtimizado" currentSort={sort} onSort={handleSort} align="right" />
                  <SortableHeader label="Custo Total" sortKey="custoTotal" currentSort={sort} onSort={handleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedCenarios.slice(0, 12).map((c) => (
                  <tr
                    key={c.id}
                    className={cn(
                      "border-b border-brightGrey/50 hover:bg-black/20 transition-colors",
                      c.isBest && "bg-primary/10"
                    )}
                  >
                    <td className="w-8 px-2 py-2 text-center">
                      {c.isBest && <span className="text-primary">✓</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-primary">
                      {formatCurrencyCompact(c.valorImovel)}
                    </td>
                    <td className="px-3 py-2 font-mono text-salmon">
                      {formatCurrencyCompact(
                        c.estrategia === "permuta"
                          ? c.financiamento.valorApartamentoUsado
                          : c.valorApartamento
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded border",
                        c.estrategia === "permuta"
                          ? "bg-salmon/20 text-salmon border-salmon"
                          : "bg-green/20 text-green border-green"
                      )}>
                        {c.estrategia === "permuta" ? "Permuta" : "Venda Posterior"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrencyCompact(c.financiamento.valorFinanciado)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-primary font-bold">
                      {formatCurrencyK(c.aporteExtra + c.tabelaPadrao.primeiraParcelar)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-primary">
                      {(c.cenarioOtimizado.prazoReal / 12) % 1 === 0 
                        ? `${Math.round(c.cenarioOtimizado.prazoReal / 12)}a`
                        : `${(c.cenarioOtimizado.prazoReal / 12).toFixed(1)}a`}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-salmon font-bold">
                      {formatCurrencyK(c.cenarioOtimizado.totalJuros)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrencyCompact(c.custoTotalOtimizado)}
                    </td>
                  </tr>
                ))}
                {sortedCenarios.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-ashGray">
                      Selecione pelo menos um filtro e uma estratégia
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
