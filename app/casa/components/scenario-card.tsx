"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { CheckCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons"
import type { ReactNode } from "react"

import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  generateTooltips,
  type CenarioCompleto,
  type ComprometimentoRendaResult,
} from "./utils/calculations"

// Generate default tooltips for static components
const defaultTooltips = generateTooltips()

// ============================================================================
// TYPES
// ============================================================================

interface EstrategiaBadgeProps {
  estrategia: "permuta" | "venda_posterior"
}

interface ComprometimentoIndicatorProps {
  comprometimento: ComprometimentoRendaResult
}

interface DataRowProps {
  label: string
  value: ReactNode
  tooltip?: string
  highlight?: boolean
  className?: string
}

interface ScenarioCardProps {
  cenario: CenarioCompleto
  isExpanded?: boolean
}

interface ScenarioCardCompactProps {
  cenario: CenarioCompleto
  onClick?: () => void
}

interface BestScenarioCardProps {
  cenario: CenarioCompleto | null
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Badge de estratégia
 */
const EstrategiaBadge = ({ estrategia }: EstrategiaBadgeProps) => {
  const config = {
    permuta: {
      label: "Permuta",
      className: "bg-salmon/20 text-salmon border-salmon",
      icon: "🔄",
    },
    venda_posterior: {
      label: "Venda Posterior",
      className: "bg-green/20 text-green border-green",
      icon: "⏱️",
    },
  }

  const { label, className, icon } = config[estrategia] || config.permuta

  return (
    <span
      className={cn(
        "px-2 py-1 text-xs rounded-md border inline-flex items-center gap-1",
        className
      )}
    >
      <span>{icon}</span>
      {label}
    </span>
  )
}

/**
 * Indicador de comprometimento de renda
 */
const ComprometimentoIndicator = ({ comprometimento }: ComprometimentoIndicatorProps) => {
  const { percentual, dentroDoLimite } = comprometimento

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-app-surface-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  dentroDoLimite ? "bg-green" : "bg-salmon"
                )}
                style={{ width: `${Math.min(percentual * 100, 100)}%` }}
              />
            </div>
            <span
              className={cn(
                "text-xs font-mono",
                dentroDoLimite ? "text-green" : "text-salmon"
              )}
            >
              {formatPercent(percentual)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{defaultTooltips.comprometimento}</p>
          {!dentroDoLimite && (
            <p className="text-xs text-salmon mt-1">
              Acima do limite de 30%. Pode dificultar aprovação.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Linha de dado com tooltip
 */
const DataRow = ({ label, value, tooltip, highlight, className }: DataRowProps) => {
  return (
    <div
      className={cn(
        "flex justify-between items-center py-1",
        highlight && "bg-app-action/5 -mx-2 px-2 rounded",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs text-app-muted">{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-3 w-3 text-app-subtle hover:text-app-accent cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs whitespace-normal break-words">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span
        className={cn(
          "text-sm font-mono",
          highlight ? "text-app-accent font-bold" : "text-app-fg"
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ============================================================================
// SCENARIO CARDS
// ============================================================================

/**
 * Card de cenário individual
 */
export const ScenarioCard = ({ cenario, isExpanded = false }: ScenarioCardProps) => {
  const {
    valorImovel,
    valorApartamento,
    estrategia,
    isBest,
    financiamento,
    tabelaPadrao,
    cenarioOtimizado,
    comprometimento,
    economiaJuros,
    economiaPercentual,
    custosFechamento,
    custoTotalPadrao,
    custoTotalOtimizado,
    cetEstimado,
    aporteExtra,
  } = cenario

  // Generate dynamic tooltips based on cenario values
  const tooltips = generateTooltips({
    aporteExtra,
    economiaJuros,
  })

  return (
    <Card
      className={cn(
        "bg-app-surface-muted border-app-border transition-all hover:border-app-action/50",
        isBest && "border-app-action ring-1 ring-primary/30"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-app-accent">
                {formatCurrencyCompact(valorImovel)}
              </span>
              <span className="text-app-subtle">+</span>
              <span className="text-salmon">
                Apto {formatCurrencyCompact(valorApartamento)}
              </span>
            </CardTitle>
            <EstrategiaBadge estrategia={estrategia} />
          </div>
          {isBest && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 bg-app-action/20 text-app-accent px-2 py-1 rounded-md text-xs">
                    <CheckCircledIcon className="h-4 w-4" />
                    Melhor
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Cenário com menor custo total de juros
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Financiamento */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-app-muted uppercase tracking-wider">
            Financiamento
          </h4>
          <DataRow
            label="Valor Financiado"
            value={formatCurrency(financiamento.valorFinanciado)}
            tooltip="Valor total a ser financiado após entrada e/ou permuta."
          />
          <DataRow
            label="Entrada sem Apto"
            value={formatCurrency(financiamento.entradaDinheiro)}
            tooltip="Valor em dinheiro da entrada, sem incluir o apartamento."
          />
          {estrategia === "permuta" && (
            <DataRow
              label="Apto na Permuta"
              value={formatCurrency(financiamento.valorApartamentoUsado)}
              tooltip={`Valor aceito do apartamento na permuta: ${formatCurrency(financiamento.valorApartamentoUsado)}.`}
              className="text-salmon"
            />
          )}
          <DataRow
            label="Entrada Total"
            value={formatCurrency(financiamento.entradaTotal)}
            tooltip="Soma de dinheiro + valor do apartamento (se permuta)."
          />
        </div>

        {/* Parcelas */}
        <div className="space-y-1 pt-2 border-t border-app-border">
          <h4 className="text-xs font-semibold text-app-muted uppercase tracking-wider">
            Parcelas (SAC)
          </h4>
          <DataRow
            label="Primeira Parcela"
            value={formatCurrency(tabelaPadrao.primeiraParcelar)}
            tooltip={`Parcela mais alta do financiamento (início do SAC): ${formatCurrency(tabelaPadrao.primeiraParcelar)}.`}
            highlight
          />
          <DataRow
            label="Última Parcela"
            value={formatCurrency(tabelaPadrao.ultimaParcela)}
            tooltip={`Parcela mais baixa (fim do SAC): ${formatCurrency(tabelaPadrao.ultimaParcela)}.`}
          />
          <div className="pt-1">
            <span className="text-xs text-app-muted">Comprometimento Renda</span>
            <ComprometimentoIndicator comprometimento={comprometimento} />
          </div>
        </div>

        {/* Cenário Otimizado */}
        <div className="space-y-1 pt-2 border-t border-app-border">
          <h4 className="text-xs font-semibold text-app-accent uppercase tracking-wider">
            Com Amortização Extra
          </h4>
          <DataRow
            label="📈 Aporte Extra/mês"
            value={
              <span className="text-app-accent font-bold">
                +{formatCurrency(aporteExtra)}
              </span>
            }
            tooltip={tooltips.aporteExtra}
            highlight
          />
          <DataRow
            label="1ª Parcela + Amort. Extra"
            value={formatCurrency(tabelaPadrao.primeiraParcelar + aporteExtra)}
            tooltip={`Total da primeira parcela incluindo amortização extra: ${formatCurrency(tabelaPadrao.primeiraParcelar)} (parcela) + ${formatCurrency(aporteExtra)} (extra) = ${formatCurrency(tabelaPadrao.primeiraParcelar + aporteExtra)}.`}
            highlight
          />
          <DataRow
            label="Prazo Real"
            value={`${cenarioOtimizado.prazoReal} meses (${(cenarioOtimizado.prazoReal / 12).toFixed(1)} anos)`}
            tooltip={`Tempo real para quitar com aportes de ${formatCurrency(aporteExtra)}/mês.`}
          />
          <DataRow
            label="Economia de Tempo"
            value={`${cenarioOtimizado.mesesEconomizados} meses (${cenarioOtimizado.anosEconomizados} anos)`}
            tooltip={`Você economiza ${cenarioOtimizado.mesesEconomizados} meses (${cenarioOtimizado.anosEconomizados} anos) com amortização acelerada.`}
          />
        </div>

        {/* Juros */}
        <div className="space-y-1 pt-2 border-t border-app-border">
          <h4 className="text-xs font-semibold text-app-muted uppercase tracking-wider">
            Custos de Juros
          </h4>
          <DataRow
            label="Juros (Padrão)"
            value={formatCurrency(tabelaPadrao.totalJuros)}
            tooltip={`Total de juros sem amortização extra: ${formatCurrency(tabelaPadrao.totalJuros)}.`}
          />
          <DataRow
            label="Juros (Otimizado)"
            value={formatCurrency(cenarioOtimizado.totalJuros)}
            tooltip={tooltips.economiaJuros}
            highlight
          />
          <DataRow
            label="Economia"
            value={
              <span className="text-green">
                {formatCurrency(economiaJuros)} ({formatPercent(economiaPercentual)})
              </span>
            }
            tooltip={`Economia total: ${formatCurrency(economiaJuros)} (${formatPercent(economiaPercentual)} dos juros).`}
          />
        </div>

        {/* Custos Adicionais */}
        {isExpanded && (
          <div className="space-y-1 pt-2 border-t border-app-border">
            <h4 className="text-xs font-semibold text-app-muted uppercase tracking-wider">
              Custos de Fechamento
            </h4>
            <DataRow
              label="ITBI"
              value={formatCurrency(custosFechamento.itbi.total)}
              tooltip={tooltips.itbi}
            />
            <DataRow
              label="Cartório/Registro"
              value={formatCurrency(custosFechamento.cartorio.total)}
              tooltip={`Custos de cartório: ${formatCurrency(custosFechamento.cartorio.total)}.`}
            />
            <DataRow
              label="Total Fechamento"
              value={formatCurrency(custosFechamento.total)}
            />
          </div>
        )}

        {/* Custo Total */}
        <div className="space-y-1 pt-2 border-t border-app-action/30 bg-app-action/5 -mx-4 px-4 py-2 rounded-b-lg">
          <h4 className="text-xs font-semibold text-app-accent uppercase tracking-wider">
            Custo Total do Imóvel
          </h4>
          <DataRow
            label="Sem Amortização Extra"
            value={formatCurrency(custoTotalPadrao)}
            className="text-app-subtle"
          />
          <DataRow
            label="Com Amortização Extra"
            value={formatCurrency(custoTotalOtimizado)}
            highlight
          />
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-app-muted">CET Estimado</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-mono text-salmon cursor-help">
                    {formatPercent(cetEstimado)} a.a.
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs whitespace-normal break-words">
                  <p className="text-xs">{tooltips.cetEstimado}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Card compacto para grid
 */
export const ScenarioCardCompact = ({ cenario, onClick }: ScenarioCardCompactProps) => {
  const {
    valorImovel,
    valorApartamento,
    estrategia,
    isBest,
    financiamento,
    tabelaPadrao,
    cenarioOtimizado,
    comprometimento,
    economiaJuros,
    aporteExtra,
  } = cenario

  return (
    <Card
      className={cn(
        "bg-app-surface-muted border-app-border cursor-pointer transition-all hover:border-app-action/50 hover:scale-[1.02]",
        isBest && "border-app-action ring-1 ring-primary/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-app-accent">
              {formatCurrencyCompact(valorImovel)}
            </span>
            <EstrategiaBadge estrategia={estrategia} />
          </div>
          {isBest && (
            <CheckCircledIcon className="h-5 w-5 text-app-accent" />
          )}
        </div>

        {/* Apto */}
        <div className="text-xs text-app-muted">
          Apto:{" "}
          <span className="text-salmon font-mono">
            {formatCurrencyCompact(valorApartamento)}
          </span>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-app-subtle block">Financiado</span>
            <span className="text-app-fg font-mono">
              {formatCurrencyCompact(financiamento.valorFinanciado)}
            </span>
          </div>
          <div>
            <span className="text-app-subtle block">1ª Parcela</span>
            <span className="text-app-fg font-mono">
              {formatCurrencyCompact(tabelaPadrao.primeiraParcelar)}
            </span>
          </div>
          <div>
            <span className="text-app-subtle block">Prazo Otim.</span>
            <span className="text-app-accent font-mono">
              {(cenarioOtimizado.prazoReal / 12).toFixed(1)} anos
            </span>
          </div>
          <div>
            <span className="text-app-subtle block">Total Pago</span>
            <span className="text-app-fg font-mono">
              {formatCurrencyCompact(cenarioOtimizado.totalPago)}
            </span>
          </div>
        </div>

        {/* Amortização Extra */}
        <div className="flex justify-between items-center text-xs bg-app-action/10 rounded-md px-2 py-1">
          <span className="text-app-accent">📈 Aporte Extra/mês</span>
          <span className="font-mono font-bold text-app-accent">
            +{formatCurrencyCompact(aporteExtra)}
          </span>
        </div>

        {/* Juros - seção destacada */}
        <div className="bg-app-surface rounded-md p-2 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-salmon">💸 Juros a Pagar</span>
            <span className="text-sm font-mono font-bold text-salmon">
              {formatCurrencyCompact(cenarioOtimizado.totalJuros)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-green">💚 Economia vs 30 anos</span>
            <span className="text-sm font-mono font-bold text-green">
              {formatCurrencyCompact(economiaJuros)}
            </span>
          </div>
        </div>

        {/* Comprometimento */}
        <ComprometimentoIndicator comprometimento={comprometimento} />
      </CardContent>
    </Card>
  )
}

/**
 * Card de destaque para o melhor cenário
 */
export const BestScenarioCard = ({ cenario }: BestScenarioCardProps) => {
  if (!cenario) return null

  const {
    valorImovel,
    valorApartamento,
    estrategia,
    financiamento,
    cenarioOtimizado,
    economiaJuros,
    custoTotalOtimizado,
    aporteExtra,
  } = cenario

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-green/10 border-app-action">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          Melhor Cenário
          <span className="text-sm font-normal text-app-muted ml-2">
            (com aporte de +{formatCurrencyCompact(aporteExtra)}/mês)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold text-app-accent">
            {formatCurrencyCompact(valorImovel)}
          </span>
          <span className="text-app-subtle">+</span>
          <span className="text-salmon">
            Apto {formatCurrencyCompact(valorApartamento)}
          </span>
          <EstrategiaBadge estrategia={estrategia} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-app-fg/30 rounded-lg p-3 border border-app-action/30">
            <span className="text-xs text-app-accent block">📈 Aporte Extra/mês</span>
            <span className="text-lg font-bold text-app-accent">
              +{formatCurrencyCompact(aporteExtra)}
            </span>
          </div>
          <div className="bg-app-fg/30 rounded-lg p-3">
            <span className="text-xs text-app-muted block">Financiado</span>
            <span className="text-lg font-bold text-app-fg">
              {formatCurrencyCompact(financiamento.valorFinanciado)}
            </span>
          </div>
          <div className="bg-app-fg/30 rounded-lg p-3">
            <span className="text-xs text-app-muted block">Prazo Real</span>
            <span className="text-lg font-bold text-app-accent">
              {(cenarioOtimizado.prazoReal / 12).toFixed(1)} anos
            </span>
          </div>
          <div className="bg-app-fg/30 rounded-lg p-3 border border-salmon/30">
            <span className="text-xs text-salmon block">💸 Juros a Pagar</span>
            <span className="text-lg font-bold text-salmon">
              {formatCurrencyCompact(cenarioOtimizado.totalJuros)}
            </span>
          </div>
          <div className="bg-app-fg/30 rounded-lg p-3">
            <span className="text-xs text-green block">💚 Economia</span>
            <span className="text-lg font-bold text-green">
              {formatCurrencyCompact(economiaJuros)}
            </span>
          </div>
          <div className="bg-app-fg/30 rounded-lg p-3">
            <span className="text-xs text-app-muted block">Custo Total</span>
            <span className="text-lg font-bold text-app-fg">
              {formatCurrencyCompact(custoTotalOtimizado)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

