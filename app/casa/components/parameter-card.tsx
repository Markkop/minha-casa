"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { InfoCircledIcon } from "@radix-ui/react-icons"
import type { ChangeEvent, ReactNode } from "react"

import { formatCurrency, generateTooltips } from "./utils/calculations"
import { useSettings } from "./utils/settings"
import type { SimulatorParams } from "./simulator-client"
import { PERCENTAGE_OPTIONS } from "./simulator-client"

// ============================================================================
// TYPES
// ============================================================================

interface FieldWithTooltipProps {
  label: string
  tooltip?: string
  children: ReactNode
  className?: string
}

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
}

interface PercentInputProps {
  value: number
  onChange: (value: number) => void
}

interface ParameterCardProps {
  params: SimulatorParams
  onChange: (params: SimulatorParams) => void
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Campo com tooltip informativo
 */
const FieldWithTooltip = ({ label, tooltip, children, className }: FieldWithTooltipProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Label className="text-sm text-ashGray">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-4 w-4 text-dimGray hover:text-primary cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  )
}

/**
 * Input monetário formatado
 */
const CurrencyInput = ({ value, onChange, ...props }: CurrencyInputProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "")
    const numericValue = parseInt(rawValue, 10) || 0
    onChange(numericValue)
  }

  return (
    <Input
      type="text"
      value={formatCurrency(value)}
      onChange={handleChange}
      className="font-mono"
      {...props}
    />
  )
}

/**
 * Input percentual
 */
const PercentInput = ({ value, onChange, ...props }: PercentInputProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".")
    const numericValue = parseFloat(rawValue) || 0
    onChange(numericValue / 100)
  }

  return (
    <Input
      type="text"
      value={`${(value * 100).toFixed(2)}%`}
      onChange={handleChange}
      className="font-mono"
      {...props}
    />
  )
}

// ============================================================================
// PARAMETER CARDS
// ============================================================================

/**
 * Card de parâmetros do imóvel
 */
export const ImovelParameterCard = ({ params, onChange }: ParameterCardProps) => {
  const { settings } = useSettings()
  const prazoOptions = settings.prazoOptions
  const taxaAnualRange = settings.sliders.taxaAnual
  const trMensalRange = settings.sliders.trMensal

  // Generate dynamic tooltips
  const tooltips = generateTooltips({
    taxaAnualRange,
    trMensalRange,
    prazoOptions,
  })

  return (
    <Card className="bg-eerieBlack border-brightGrey">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          Imóvel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldWithTooltip label="Valor da Casa" tooltip={tooltips.valorImovel}>
          <CurrencyInput
            value={params.valorImovelSelecionado}
            onChange={(v) =>
              onChange({ ...params, valorImovelSelecionado: v })
            }
          />
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Taxa de Juros Anual"
          tooltip={tooltips.taxaAnual}
        >
          <div className="space-y-2">
            <Slider
              value={[params.taxaAnual * 100]}
              onValueChange={([v]) =>
                onChange({ ...params, taxaAnual: v / 100 })
              }
              min={taxaAnualRange.min}
              max={taxaAnualRange.max}
              step={taxaAnualRange.step}
              className="py-2"
            />
            <PercentInput
              value={params.taxaAnual}
              onChange={(v) => onChange({ ...params, taxaAnual: v })}
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip label="TR Mensal" tooltip={tooltips.trMensal}>
          <div className="space-y-2">
            <Slider
              value={[params.trMensal * 100]}
              onValueChange={([v]) =>
                onChange({ ...params, trMensal: v / 100 })
              }
              min={trMensalRange.min}
              max={trMensalRange.max}
              step={trMensalRange.step}
              className="py-2"
            />
            <PercentInput
              value={params.trMensal}
              onChange={(v) => onChange({ ...params, trMensal: v })}
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Prazo (meses)"
          tooltip={tooltips.prazoMeses}
        >
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              {prazoOptions.map((prazo) => (
                <button
                  key={prazo}
                  onClick={() => onChange({ ...params, prazoMeses: prazo })}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md border transition-all",
                    params.prazoMeses === prazo
                      ? "bg-primary text-black border-primary font-bold"
                      : "bg-middleGray50 border-brightGrey text-ashGray hover:border-primary"
                  )}
                >
                  {prazo / 12} anos
                </button>
              ))}
            </div>
            <Input
              type="number"
              value={params.prazoMeses}
              onChange={(e) =>
                onChange({ ...params, prazoMeses: parseInt(e.target.value) || 360 })
              }
              className="font-mono"
            />
          </div>
        </FieldWithTooltip>
      </CardContent>
    </Card>
  )
}

/**
 * Card de parâmetros de recursos
 */
export const RecursosParameterCard = ({ params, onChange }: ParameterCardProps) => {
  const entrada = params.capitalDisponivel - params.reservaEmergencia

  // Generate dynamic tooltips
  const tooltips = generateTooltips({
    reservaEmergencia: params.reservaEmergencia,
  })

  return (
    <Card className="bg-eerieBlack border-brightGrey">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">💰</span>
          Recursos Disponíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldWithTooltip
          label="Capital Disponível"
          tooltip={tooltips.capitalDisponivel}
        >
          <CurrencyInput
            value={params.capitalDisponivel}
            onChange={(v) => onChange({ ...params, capitalDisponivel: v })}
          />
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Reserva de Emergência"
          tooltip={tooltips.reservaEmergencia}
        >
          <CurrencyInput
            value={params.reservaEmergencia}
            onChange={(v) => onChange({ ...params, reservaEmergencia: v })}
          />
        </FieldWithTooltip>

        <div className="pt-2 border-t border-brightGrey">
          <div className="flex justify-between items-center">
            <span className="text-sm text-ashGray">Entrada Disponível</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(entrada)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Card de parâmetros do imóvel que o comprador já tem (antigo apartamento)
 */
export const ImovelCompradorParameterCard = ({ params, onChange }: ParameterCardProps) => {
  const { settings } = useSettings()
  const haircutRange = settings.sliders.haircut

  // Generate dynamic tooltips
  const tooltips = generateTooltips({
    haircutRange,
  })

  return (
    <Card className="bg-eerieBlack border-brightGrey">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🏢</span>
          Imóvel que o Comprador Já Tem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldWithTooltip
          label="Valor do Imóvel"
          tooltip={tooltips.valorApartamento}
        >
          <CurrencyInput
            value={params.valorApartamentoSelecionado}
            onChange={(v) =>
              onChange({ ...params, valorApartamentoSelecionado: v })
            }
          />
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Haircut (Deságio Permuta)"
          tooltip={tooltips.haircut}
        >
          <div className="space-y-2">
            <Slider
              value={[params.haircut * 100]}
              onValueChange={([v]) =>
                onChange({ ...params, haircut: v / 100 })
              }
              min={haircutRange.min}
              max={haircutRange.max}
              step={haircutRange.step}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-dimGray">
              <span>{haircutRange.min}%</span>
              <span className="text-ashGray font-mono">
                {(params.haircut * 100).toFixed(0)}%
              </span>
              <span>{haircutRange.max}%</span>
            </div>
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Custo Condomínio/IPTU Mensal"
          tooltip="Custo mensal para manter o imóvel vazio durante o período de venda."
        >
          <CurrencyInput
            value={params.custoCondominioMensal}
            onChange={(v) => onChange({ ...params, custoCondominioMensal: v })}
          />
        </FieldWithTooltip>
      </CardContent>
    </Card>
  )
}

/**
 * Card de parâmetros de amortização
 */
export const AmortizacaoParameterCard = ({ params, onChange }: ParameterCardProps) => {
  const { settings } = useSettings()
  const aporteExtraRange = settings.sliders.aporteExtra
  const rendaMensalRange = settings.sliders.rendaMensal

  // Generate dynamic tooltips
  const tooltips = generateTooltips({
    aporteExtra: params.aporteExtra,
    aporteExtraRange,
    rendaMensalRange,
  })

  return (
    <Card className="bg-eerieBlack border-brightGrey">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">📈</span>
          Amortização e Renda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldWithTooltip
          label="Aporte Extra Mensal"
          tooltip={tooltips.aporteExtra}
        >
          <div className="space-y-2">
            <Slider
              value={[params.aporteExtra]}
              onValueChange={([v]) => onChange({ ...params, aporteExtra: v })}
              min={aporteExtraRange.min}
              max={aporteExtraRange.max}
              step={aporteExtraRange.step}
              className="py-2"
            />
            <CurrencyInput
              value={params.aporteExtra}
              onChange={(v) => onChange({ ...params, aporteExtra: v })}
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip label="Renda Mensal" tooltip={tooltips.rendaMensal}>
          <div className="space-y-2">
            <Slider
              value={[params.rendaMensal]}
              onValueChange={([v]) => onChange({ ...params, rendaMensal: v })}
              min={rendaMensalRange.min}
              max={rendaMensalRange.max}
              step={rendaMensalRange.step}
              className="py-2"
            />
            <CurrencyInput
              value={params.rendaMensal}
              onChange={(v) => onChange({ ...params, rendaMensal: v })}
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Seguros (MIP + DFI)"
          tooltip={`Seguros obrigatórios: Morte e Invalidez Permanente (MIP) e Danos Físicos ao Imóvel (DFI). Valor atual: ${formatCurrency(params.seguros)}/mês.`}
        >
          <CurrencyInput
            value={params.seguros}
            onChange={(v) => onChange({ ...params, seguros: v })}
          />
        </FieldWithTooltip>
      </CardContent>
    </Card>
  )
}

/**
 * Card de filtros de cenário
 */
export const FiltrosCenarioCard = ({ params, onChange }: ParameterCardProps) => {
  // Generate dynamic tooltips
  const tooltips = generateTooltips()

  // Compute actual values for display
  const valoresImovelComputados = PERCENTAGE_OPTIONS.map((o) => ({
    multiplier: o.value,
    label: o.label,
    valor: Math.round(params.valorImovelSelecionado * o.value),
  }))

  const valoresAptoComputados = PERCENTAGE_OPTIONS.map((o) => ({
    multiplier: o.value,
    label: o.label,
    valor: Math.round(params.valorApartamentoSelecionado * o.value),
  }))

  return (
    <Card className="bg-raisinBlack border-brightGrey">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          Filtros de Visualização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldWithTooltip
          label="Valores do Imóvel (Casa)"
          tooltip="Selecione quais variações de valor do imóvel mostrar na comparação."
        >
          <div className="flex gap-2 flex-wrap">
            {valoresImovelComputados.map(({ multiplier, label, valor }) => (
              <button
                key={multiplier}
                onClick={() => {
                  const current = params.valoresImovelFiltroMultipliers
                  const updated = current.includes(multiplier)
                    ? current.filter((v) => v !== multiplier)
                    : [...current, multiplier]
                  onChange({ ...params, valoresImovelFiltroMultipliers: updated })
                }}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md border transition-all flex flex-col items-center gap-0.5",
                  params.valoresImovelFiltroMultipliers.includes(multiplier)
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-middleGray50 border-brightGrey text-dimGray"
                )}
              >
                <span className="font-semibold">{label}</span>
                <span className="text-[10px] opacity-75">{formatCurrency(valor)}</span>
              </button>
            ))}
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Valores do Imóvel do Comprador"
          tooltip="Selecione quais variações de valor do imóvel do comprador mostrar na comparação."
        >
          <div className="flex gap-2 flex-wrap">
            {valoresAptoComputados.map(({ multiplier, label, valor }) => (
              <button
                key={multiplier}
                onClick={() => {
                  const current = params.valoresAptoFiltroMultipliers
                  const updated = current.includes(multiplier)
                    ? current.filter((v) => v !== multiplier)
                    : [...current, multiplier]
                  onChange({ ...params, valoresAptoFiltroMultipliers: updated })
                }}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md border transition-all flex flex-col items-center gap-0.5",
                  params.valoresAptoFiltroMultipliers.includes(multiplier)
                    ? "bg-salmon/20 text-salmon border-salmon"
                    : "bg-middleGray50 border-brightGrey text-dimGray"
                )}
              >
                <span className="font-semibold">{label}</span>
                <span className="text-[10px] opacity-75">{formatCurrency(valor)}</span>
              </button>
            ))}
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Estratégias"
          tooltip={tooltips.estrategia}
        >
          <div className="flex gap-2">
            {[
              { value: "permuta" as const, label: "Permuta" },
              { value: "venda_posterior" as const, label: "Venda Posterior" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  const current = params.estrategiasFiltro || ["permuta", "venda_posterior"]
                  const updated = current.includes(value)
                    ? current.filter((v) => v !== value)
                    : [...current, value]
                  onChange({ ...params, estrategiasFiltro: updated as ("permuta" | "venda_posterior")[] })
                }}
                className={cn(
                  "px-3 py-1 text-xs rounded-md border transition-all",
                  (params.estrategiasFiltro || ["permuta", "venda_posterior"]).includes(value)
                    ? "bg-green/20 text-green border-green"
                    : "bg-middleGray50 border-brightGrey text-dimGray"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </FieldWithTooltip>
      </CardContent>
    </Card>
  )
}
