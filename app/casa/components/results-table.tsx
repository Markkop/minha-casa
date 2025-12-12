"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircledIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons"
import { useState } from "react"

import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  TOOLTIPS,
  type CenarioCompleto,
  type ParcelaDetalhe,
} from "./utils/calculations"

// ============================================================================
// TYPES
// ============================================================================

type SortKey =
  | "valorImovel"
  | "valorApartamento"
  | "valorFinanciado"
  | "parcela"
  | "comprometimento"
  | "prazoReal"
  | "jurosOtimizado"
  | "economiaJuros"
  | "custoTotal"

type SortDirection = "asc" | "desc"

interface SortState {
  key: SortKey
  direction: SortDirection
}

interface SortableHeaderProps {
  label: string
  tooltip?: string
  sortKey: SortKey
  currentSort: SortState
  onSort: (key: SortKey) => void
}

interface EstrategiaBadgeInlineProps {
  estrategia: "permuta" | "venda_posterior"
}

interface AprovacaoIndicatorProps {
  dentroDoLimite: boolean
}

interface ResultsTableProps {
  cenarios: CenarioCompleto[]
  onSelectCenario?: (cenario: CenarioCompleto) => void
}

interface AmortizationSampleTableProps {
  parcelas: ParcelaDetalhe[] | null | undefined
}

interface SummaryComparisonProps {
  cenarios: CenarioCompleto[] | null | undefined
}

interface StatCard {
  label: string
  value: string
  icon: string
  highlight?: boolean
  variant?: "salmon"
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Header com tooltip e sorting
 */
const SortableHeader = ({
  label,
  tooltip,
  sortKey,
  currentSort,
  onSort,
}: SortableHeaderProps) => {
  const isActive = currentSort?.key === sortKey
  const isAsc = isActive && currentSort?.direction === "asc"

  return (
    <TableHead
      className="cursor-pointer hover:bg-middleGray/30 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-3 w-3 text-dimGray" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {isActive && (
          isAsc ? (
            <ArrowUpIcon className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-primary" />
          )
        )}
      </div>
    </TableHead>
  )
}

/**
 * Badge de estratégia inline
 */
const EstrategiaBadgeInline = ({ estrategia }: EstrategiaBadgeInlineProps) => {
  const config = {
    permuta: {
      label: "Permuta",
      className: "text-salmon",
    },
    venda_posterior: {
      label: "Venda",
      className: "text-green",
    },
  }

  const { label, className } = config[estrategia] || config.permuta

  return <span className={cn("text-xs font-medium", className)}>{label}</span>
}

/**
 * Indicador de status de aprovação
 */
const AprovacaoIndicator = ({ dentroDoLimite }: AprovacaoIndicatorProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-block w-2 h-2 rounded-full",
              dentroDoLimite ? "bg-green" : "bg-salmon"
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {dentroDoLimite
              ? "Dentro do limite de 30% de comprometimento"
              : "Acima do limite - pode dificultar aprovação"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// TABLE COMPONENTS
// ============================================================================

/**
 * Tabela comparativa de cenários
 */
export const ResultsTable = ({ cenarios, onSelectCenario }: ResultsTableProps) => {
  const [sort, setSort] = useState<SortState>({ key: "economiaJuros", direction: "desc" })

  const handleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }))
  }

  // Ordenar cenários
  const sortedCenarios = [...cenarios].sort((a, b) => {
    const getValue = (cenario: CenarioCompleto, key: SortKey): number => {
      const paths: Record<SortKey, number> = {
        valorImovel: cenario.valorImovel,
        valorApartamento: cenario.valorApartamento,
        valorFinanciado: cenario.financiamento.valorFinanciado,
        parcela: cenario.tabelaPadrao.primeiraParcelar,
        comprometimento: cenario.comprometimento.percentual,
        prazoReal: cenario.cenarioOtimizado.prazoReal,
        jurosOtimizado: cenario.cenarioOtimizado.totalJuros,
        economiaJuros: cenario.economiaJuros,
        custoTotal: cenario.custoTotalOtimizado,
      }
      return paths[key] ?? 0
    }

    const aVal = getValue(a, sort.key)
    const bVal = getValue(b, sort.key)

    return sort.direction === "asc" ? aVal - bVal : bVal - aVal
  })

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-brightGrey hover:bg-transparent">
            <TableHead className="w-8"></TableHead>
            <SortableHeader
              label="Casa"
              tooltip={TOOLTIPS.valorImovel}
              sortKey="valorImovel"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label="Apto"
              tooltip={TOOLTIPS.valorApartamento}
              sortKey="valorApartamento"
              currentSort={sort}
              onSort={handleSort}
            />
            <TableHead>Estratégia</TableHead>
            <SortableHeader
              label="Financiado"
              tooltip="Valor total a ser financiado"
              sortKey="valorFinanciado"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label="1ª Parcela"
              tooltip="Primeira parcela (maior valor no SAC)"
              sortKey="parcela"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label="Compr."
              tooltip={TOOLTIPS.comprometimento}
              sortKey="comprometimento"
              currentSort={sort}
              onSort={handleSort}
            />
            <TableHead className="text-primary">
              📈 Aporte/mês
            </TableHead>
            <SortableHeader
              label="Prazo"
              tooltip="Prazo real com amortização extra"
              sortKey="prazoReal"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label="💸 Juros a Pagar"
              tooltip="Total de juros que você vai pagar (com amortização extra)"
              sortKey="jurosOtimizado"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label="Economia"
              tooltip={TOOLTIPS.economiaJuros}
              sortKey="economiaJuros"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label="Custo Total"
              tooltip="Custo total do imóvel (valor + juros + fechamento)"
              sortKey="custoTotal"
              currentSort={sort}
              onSort={handleSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCenarios.map((cenario) => (
            <TableRow
              key={cenario.id}
              className={cn(
                "border-brightGrey cursor-pointer transition-colors",
                cenario.isBest
                  ? "bg-primary/10 hover:bg-primary/20"
                  : "hover:bg-middleGray/30"
              )}
              onClick={() => onSelectCenario?.(cenario)}
            >
              <TableCell className="w-8">
                {cenario.isBest && (
                  <CheckCircledIcon className="h-4 w-4 text-primary" />
                )}
              </TableCell>
              <TableCell className="font-mono text-sm text-primary">
                {formatCurrencyCompact(cenario.valorImovel)}
              </TableCell>
              <TableCell className="font-mono text-sm text-salmon">
                {formatCurrencyCompact(cenario.valorApartamento)}
              </TableCell>
              <TableCell>
                <EstrategiaBadgeInline estrategia={cenario.estrategia} />
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatCurrencyCompact(cenario.financiamento.valorFinanciado)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatCurrencyCompact(cenario.tabelaPadrao.primeiraParcelar)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <AprovacaoIndicator
                    dentroDoLimite={cenario.comprometimento.dentroDoLimite}
                  />
                  <span
                    className={cn(
                      "font-mono text-xs",
                      cenario.comprometimento.dentroDoLimite
                        ? "text-green"
                        : "text-salmon"
                    )}
                  >
                    {formatPercent(cenario.comprometimento.percentual)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm text-primary font-bold">
                +{formatCurrencyCompact(cenario.aporteExtra)}
              </TableCell>
              <TableCell className="font-mono text-sm text-primary">
                {(cenario.cenarioOtimizado.prazoReal / 12).toFixed(1)}a
              </TableCell>
              <TableCell className="font-mono text-sm text-salmon font-bold">
                {formatCurrencyCompact(cenario.cenarioOtimizado.totalJuros)}
              </TableCell>
              <TableCell className="font-mono text-sm text-green">
                {formatCurrencyCompact(cenario.economiaJuros)}
              </TableCell>
              <TableCell className="font-mono text-sm font-bold">
                {formatCurrencyCompact(cenario.custoTotalOtimizado)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Tabela de parcelas amostra
 */
export const AmortizationSampleTable = ({ parcelas }: AmortizationSampleTableProps) => {
  if (!parcelas || parcelas.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-brightGrey">
            <TableHead>Mês</TableHead>
            <TableHead>Saldo Devedor</TableHead>
            <TableHead>Amortização</TableHead>
            <TableHead>Juros</TableHead>
            <TableHead>Prestação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parcelas.map((parcela) => (
            <TableRow key={parcela.mes} className="border-brightGrey">
              <TableCell className="font-mono text-sm">
                {parcela.mes}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatCurrency(parcela.saldoDevedor)}
              </TableCell>
              <TableCell className="font-mono text-sm text-primary">
                {formatCurrency(parcela.amortizacao)}
              </TableCell>
              <TableCell className="font-mono text-sm text-salmon">
                {formatCurrency(parcela.juros)}
              </TableCell>
              <TableCell className="font-mono text-sm font-bold">
                {formatCurrency(parcela.prestacao)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Resumo comparativo de cenários
 */
export const SummaryComparison = ({ cenarios }: SummaryComparisonProps) => {
  if (!cenarios || cenarios.length === 0) return null

  // Calcular estatísticas
  const stats = {
    menorFinanciamento: Math.min(
      ...cenarios.map((c) => c.financiamento.valorFinanciado)
    ),
    maiorFinanciamento: Math.max(
      ...cenarios.map((c) => c.financiamento.valorFinanciado)
    ),
    menorParcela: Math.min(
      ...cenarios.map((c) => c.tabelaPadrao.primeiraParcelar)
    ),
    maiorParcela: Math.max(
      ...cenarios.map((c) => c.tabelaPadrao.primeiraParcelar)
    ),
    menorJuros: Math.min(
      ...cenarios.map((c) => c.cenarioOtimizado.totalJuros)
    ),
    maiorJuros: Math.max(
      ...cenarios.map((c) => c.cenarioOtimizado.totalJuros)
    ),
    menorPrazo: Math.min(
      ...cenarios.map((c) => c.cenarioOtimizado.prazoReal)
    ),
    maiorPrazo: Math.max(
      ...cenarios.map((c) => c.cenarioOtimizado.prazoReal)
    ),
    maiorEconomia: Math.max(...cenarios.map((c) => c.economiaJuros)),
    cenariosAprovados: cenarios.filter(
      (c) => c.comprometimento.dentroDoLimite
    ).length,
  }

  const statCards: StatCard[] = [
    {
      label: "Range Financiamento",
      value: `${formatCurrencyCompact(stats.menorFinanciamento)} - ${formatCurrencyCompact(stats.maiorFinanciamento)}`,
      icon: "💰",
    },
    {
      label: "Range Parcela",
      value: `${formatCurrencyCompact(stats.menorParcela)} - ${formatCurrencyCompact(stats.maiorParcela)}`,
      icon: "📊",
    },
    {
      label: "💸 Juros a Pagar",
      value: `${formatCurrencyCompact(stats.menorJuros)} - ${formatCurrencyCompact(stats.maiorJuros)}`,
      icon: "",
      variant: "salmon",
    },
    {
      label: "Range Prazo (Otim.)",
      value: `${(stats.menorPrazo / 12).toFixed(1)} - ${(stats.maiorPrazo / 12).toFixed(1)} anos`,
      icon: "⏱️",
    },
    {
      label: "💚 Maior Economia",
      value: formatCurrencyCompact(stats.maiorEconomia),
      icon: "",
      highlight: true,
    },
    {
      label: "Aprovação Crédito",
      value: `${stats.cenariosAprovados}/${cenarios.length} cenários`,
      icon: stats.cenariosAprovados === cenarios.length ? "✅" : "⚠️",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map(({ label, value, icon, highlight, variant }) => (
        <div
          key={label}
          className={cn(
            "bg-eerieBlack border border-brightGrey rounded-lg p-3",
            highlight && "border-green bg-green/5",
            variant === "salmon" && "border-salmon bg-salmon/5"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-lg">{icon}</span>}
            <span className={cn(
              "text-xs",
              variant === "salmon" ? "text-salmon" : "text-ashGray"
            )}>{label}</span>
          </div>
          <span
            className={cn(
              "text-sm font-mono font-bold",
              highlight && "text-green",
              variant === "salmon" && "text-salmon",
              !highlight && variant !== "salmon" && "text-white"
            )}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

