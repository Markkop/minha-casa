"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons"
import "katex/dist/katex.min.css"
import { BlockMath, InlineMath } from "react-katex"
import { useState } from "react"

import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  type CenarioCompleto,
} from "./utils/calculations"

// ============================================================================
// TYPES
// ============================================================================

interface FormulaBreakdownProps {
  cenario: CenarioCompleto
}

interface FormulaStepProps {
  formula: string
  description: string
}

interface FormulaSectionProps {
  title: string
  latex: string
  withValues: string
  result: string
  steps: FormulaStepProps[]
  defaultExpanded?: boolean
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Individual formula step
 */
const FormulaStep = ({ formula, description }: FormulaStepProps) => (
  <div className="flex items-start gap-2 text-xs">
    <span className="text-primary font-mono shrink-0">
      <InlineMath math={formula} />
    </span>
    <span className="text-dimGray">→ {description}</span>
  </div>
)

/**
 * Collapsible formula section
 */
const FormulaSection = ({
  title,
  latex,
  withValues,
  result,
  steps,
  defaultExpanded = true,
}: FormulaSectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-brightGrey last:border-b-0 pb-4 last:pb-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left py-2 hover:text-primary transition-colors"
      >
        <span className="text-xs font-semibold text-ashGray uppercase tracking-wider">
          {title}
        </span>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 text-dimGray" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-dimGray" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 pt-2">
          {/* LaTeX formula */}
          <div className="bg-black/40 rounded-md p-3 overflow-x-auto">
            <BlockMath math={latex} />
          </div>

          {/* With actual values */}
          <div className="bg-primary/5 rounded-md p-3 overflow-x-auto border border-primary/20">
            <BlockMath math={withValues} />
          </div>

          {/* Result */}
          <div className="text-center">
            <span className="text-sm text-ashGray">= </span>
            <span className="text-lg font-bold text-primary font-mono">
              {result}
            </span>
          </div>

          {/* Step by step */}
          {steps.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-brightGrey/50">
              <span className="text-xs text-dimGray font-semibold">
                Passo a passo:
              </span>
              <div className="space-y-1.5 pl-2">
                {steps.map((step, i) => (
                  <FormulaStep key={i} {...step} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Formula breakdown panel showing math behind calculations
 */
export const FormulaBreakdown = ({ cenario }: FormulaBreakdownProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const {
    valorImovel,
    valorApartamento,
    estrategia,
    entrada,
    financiamento,
    taxaAnual,
    trMensal,
    taxaMensalEfetiva,
    tabelaPadrao,
    cenarioOtimizado,
    comprometimento,
    economiaJuros,
    rendaMensal,
  } = cenario

  // Format helper for compact numbers in formulas
  const compact = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(2)}M`
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
    return v.toFixed(0)
  }

  // Format percent for formulas
  const pct = (v: number) => `${(v * 100).toFixed(2)}\\%`

  // Haircut value (default 15% if permuta)
  const haircut = estrategia === "permuta" ? 0.15 : 0

  // ============================================================================
  // FORMULA DEFINITIONS
  // ============================================================================

  // 1. Valor Financiado
  const valorFinanciadoFormula =
    estrategia === "permuta"
      ? {
          latex: "V_f = I - (C - R) - A \\times (1 - h)",
          withValues: `V_f = ${compact(valorImovel)} - (${compact(cenario.financiamento.entradaDinheiro + cenario.entrada)} - ${compact(cenario.entrada - cenario.financiamento.entradaDinheiro + cenario.entrada)}) - ${compact(valorApartamento)} \\times (1 - ${(haircut * 100).toFixed(0)}\\%)`,
          result: formatCurrency(financiamento.valorFinanciado),
          steps: [
            {
              formula: `C - R = ${compact(cenario.financiamento.entradaDinheiro + entrada)} - ${compact(entrada - cenario.financiamento.entradaDinheiro)} = ${compact(entrada)}`,
              description: "Capital disponível menos reserva de emergência",
            },
            {
              formula: `A \\times (1-h) = ${compact(valorApartamento)} \\times 0.${((1 - haircut) * 100).toFixed(0)} = ${compact(financiamento.valorApartamentoUsado)}`,
              description: `Valor do apartamento com deságio de ${(haircut * 100).toFixed(0)}%`,
            },
            {
              formula: `V_f = ${compact(valorImovel)} - ${compact(entrada)} - ${compact(financiamento.valorApartamentoUsado)} = ${compact(financiamento.valorFinanciado)}`,
              description: "Valor final a ser financiado",
            },
          ],
        }
      : {
          latex: "V_f = I - (C - R)",
          withValues: `V_f = ${compact(valorImovel)} - ${compact(entrada)}`,
          result: formatCurrency(financiamento.valorFinanciado),
          steps: [
            {
              formula: `C - R = ${compact(entrada + (cenario.financiamento.entradaDinheiro - entrada))} - ${compact(cenario.financiamento.entradaDinheiro - entrada)} = ${compact(entrada)}`,
              description: "Capital disponível menos reserva de emergência",
            },
            {
              formula: `V_f = ${compact(valorImovel)} - ${compact(entrada)} = ${compact(financiamento.valorFinanciado)}`,
              description: "Valor final a ser financiado",
            },
          ],
        }

  // 2. Taxa Mensal Efetiva
  const taxaFormula = {
    latex: "i_{mensal} = \\frac{i_{anual}}{12} + TR_{mensal}",
    withValues: `i_{mensal} = \\frac{${pct(taxaAnual)}}{12} + ${pct(trMensal)}`,
    result: formatPercent(taxaMensalEfetiva),
    steps: [
      {
        formula: `\\frac{${pct(taxaAnual)}}{12} = ${pct(taxaAnual / 12)}`,
        description: "Taxa de juros mensal",
      },
      {
        formula: `${pct(taxaAnual / 12)} + ${pct(trMensal)} = ${pct(taxaMensalEfetiva)}`,
        description: "Taxa efetiva mensal (juros + TR)",
      },
    ],
  }

  // 3. Parcela SAC (primeira parcela)
  const amortizacaoMensal = tabelaPadrao.amortizacaoMensal
  const juros1 = financiamento.valorFinanciado * taxaMensalEfetiva
  const seguros = 175

  const parcelaSACFormula = {
    latex: "P_1 = A + (S_0 \\times i) + seg",
    withValues: `P_1 = ${compact(amortizacaoMensal)} + (${compact(financiamento.valorFinanciado)} \\times ${pct(taxaMensalEfetiva)}) + ${seguros}`,
    result: formatCurrency(tabelaPadrao.primeiraParcelar),
    steps: [
      {
        formula: `A = \\frac{V_f}{n} = \\frac{${compact(financiamento.valorFinanciado)}}{360} = ${compact(amortizacaoMensal)}`,
        description: "Amortização mensal constante (SAC)",
      },
      {
        formula: `J_1 = S_0 \\times i = ${compact(financiamento.valorFinanciado)} \\times ${pct(taxaMensalEfetiva)} = ${compact(juros1)}`,
        description: "Juros do primeiro mês",
      },
      {
        formula: `P_1 = ${compact(amortizacaoMensal)} + ${compact(juros1)} + ${seguros} = ${compact(tabelaPadrao.primeiraParcelar)}`,
        description: "Primeira parcela total",
      },
    ],
  }

  // 4. Comprometimento de Renda
  const comprometimentoFormula = {
    latex: "\\%_{renda} = \\frac{P_1}{Renda} \\times 100",
    withValues: `\\%_{renda} = \\frac{${compact(tabelaPadrao.primeiraParcelar)}}{${compact(rendaMensal)}} \\times 100`,
    result: comprometimento.percentualFormatado,
    steps: [
      {
        formula: `\\frac{${compact(tabelaPadrao.primeiraParcelar)}}{${compact(rendaMensal)}} = ${comprometimento.percentual.toFixed(4)}`,
        description: "Razão parcela/renda",
      },
      {
        formula: `${comprometimento.percentual.toFixed(4)} \\times 100 = ${comprometimento.percentualFormatado}`,
        description: comprometimento.dentroDoLimite
          ? "Dentro do limite de 30%"
          : "⚠️ Acima do limite de 30%",
      },
    ],
  }

  // 5. Economia de Juros
  const economiaFormula = {
    latex: "E = J_{padrão} - J_{otimizado}",
    withValues: `E = ${compact(tabelaPadrao.totalJuros)} - ${compact(cenarioOtimizado.totalJuros)}`,
    result: formatCurrency(economiaJuros),
    steps: [
      {
        formula: `J_{padrão} = ${formatCurrencyCompact(tabelaPadrao.totalJuros)}`,
        description: "Total de juros sem amortização extra",
      },
      {
        formula: `J_{otimizado} = ${formatCurrencyCompact(cenarioOtimizado.totalJuros)}`,
        description: "Total de juros com amortização acelerada",
      },
      {
        formula: `E = ${formatCurrencyCompact(economiaJuros)}`,
        description: `Economia de ${formatPercent(economiaJuros / tabelaPadrao.totalJuros)} dos juros`,
      },
    ],
  }

  if (isCollapsed) {
    return (
      <Card className="bg-eerieBlack border-brightGrey">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📐</span>
            <span className="text-sm font-semibold text-ashGray">
              Fórmulas e Cálculos
            </span>
          </div>
          <ChevronDownIcon className="h-5 w-5 text-dimGray" />
        </button>
      </Card>
    )
  }

  return (
    <Card className="bg-eerieBlack border-brightGrey">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📐</span>
            Fórmulas e Cálculos
          </CardTitle>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-xs text-dimGray hover:text-primary transition-colors flex items-center gap-1"
          >
            Minimizar
            <ChevronUpIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-dimGray mt-1">
          Matemática por trás do cenário selecionado
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <FormulaSection
          title="Valor Financiado"
          {...valorFinanciadoFormula}
          defaultExpanded
        />

        <FormulaSection
          title="Taxa Mensal Efetiva"
          {...taxaFormula}
          defaultExpanded={false}
        />

        <FormulaSection
          title="Parcela SAC (1ª Parcela)"
          {...parcelaSACFormula}
          defaultExpanded={false}
        />

        <FormulaSection
          title="Comprometimento de Renda"
          {...comprometimentoFormula}
          defaultExpanded={false}
        />

        <FormulaSection
          title="Economia de Juros"
          {...economiaFormula}
          defaultExpanded={false}
        />

        {/* Legend */}
        <div className="pt-4 border-t border-brightGrey text-xs text-dimGray space-y-1">
          <p className="font-semibold text-ashGray">Legenda:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span>
              <InlineMath math="V_f" /> = Valor Financiado
            </span>
            <span>
              <InlineMath math="I" /> = Valor do Imóvel
            </span>
            <span>
              <InlineMath math="C" /> = Capital Disponível
            </span>
            <span>
              <InlineMath math="R" /> = Reserva Emergência
            </span>
            <span>
              <InlineMath math="A" /> = Valor do Apartamento
            </span>
            <span>
              <InlineMath math="h" /> = Haircut (deságio)
            </span>
            <span>
              <InlineMath math="i" /> = Taxa Mensal
            </span>
            <span>
              <InlineMath math="P" /> = Parcela
            </span>
            <span>
              <InlineMath math="S" /> = Saldo Devedor
            </span>
            <span>
              <InlineMath math="J" /> = Juros
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

