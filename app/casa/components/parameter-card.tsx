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
import { Pencil } from "lucide-react"
import { useState, useEffect, type ReactNode } from "react"

import {
  calcularPctReservaRecomendada,
  calcularReservaRecomendada,
  formatCurrency,
  generateTooltips,
} from "./utils/calculations"
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
  className?: string
}

interface PercentInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

type SliderField =
  | "valorImovel"
  | "valorApartamento"
  | "custoCondominio"
  | "seguros"
  | "prazoMeses"

export interface RecursosMeta {
  reservaRecomendada: number
  reservaPctRecomendado: number
  reservaTeto: number
  capitalSlider: { min: number; max: number; step: number }
}

export interface ParameterCardProps {
  params: SimulatorParams
  recursosMeta?: RecursosMeta
  onChange: (params: SimulatorParams) => void
  onValueChange?: (field: SliderField | "capitalDisponivel", newValue: number) => void
  onSliderChange?: (field: SliderField, multiplier: number) => void
  onCapitalChange?: (newCapital: number) => void
  onReservaChange?: (newReserva: number) => void
  onEntradaChange?: (newEntrada: number) => void
}

interface ParameterRowProps {
  label: string
  tooltip?: string
  valueDisplay: string
  slider?: {
    value: number
    min: number
    max: number
    step: number
    onValueChange: (value: number) => void
  }
  edit?: {
    type: "currency" | "percent" | "number"
    value: number
    onChange: (value: number) => void
  }
  extras?: ReactNode
  valueClassName?: string
  hint?: string
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
        <Label className="text-sm text-app-muted">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-4 w-4 text-app-subtle hover:text-app-accent cursor-help transition-colors" />
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
 * Input monetário formatado - shows raw value while editing, formatted on blur
 */
const CurrencyInput = ({ value, onChange, className, ...props }: CurrencyInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())

  // Sync inputValue with external value when not focused
  useEffect(() => {
    if (!isFocused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Controlled input sync pattern
      setInputValue(value.toString())
    }
  }, [value, isFocused])

  const handleFocus = () => {
    setIsFocused(true)
    // Show raw number when focused
    setInputValue(value.toString())
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Parse and commit the value
    const rawValue = inputValue.replace(/\D/g, "")
    const numericValue = parseInt(rawValue, 10) || 0
    onChange(numericValue)
    setInputValue(numericValue.toString())
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits
    const newValue = e.target.value.replace(/\D/g, "")
    setInputValue(newValue)
    // Update parent in real-time
    const numericValue = parseInt(newValue, 10) || 0
    onChange(numericValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      return
    }
    // Allow Ctrl/Cmd + A, C, V, X
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) {
      return
    }
    // Block non-numeric keys
    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={isFocused ? inputValue : formatCurrency(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn("font-mono", className)}
      {...props}
    />
  )
}

/**
 * Input percentual - shows raw value while editing, formatted on blur
 */
const PercentInput = ({ value, onChange, className, ...props }: PercentInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState((value * 100).toFixed(2))

  // Sync inputValue with external value when not focused
  useEffect(() => {
    if (!isFocused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Controlled input sync pattern
      setInputValue((value * 100).toFixed(2))
    }
  }, [value, isFocused])

  const handleFocus = () => {
    setIsFocused(true)
    // Show raw percentage when focused (without the % symbol)
    setInputValue((value * 100).toFixed(2))
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Parse and commit the value
    const cleanValue = inputValue.replace(/[^\d.,]/g, "").replace(",", ".")
    const numericValue = parseFloat(cleanValue) || 0
    onChange(numericValue / 100)
    setInputValue(numericValue.toFixed(2))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits, dot and comma
    const newValue = e.target.value.replace(/[^\d.,]/g, "")
    setInputValue(newValue)
    // Update parent in real-time
    const cleanValue = newValue.replace(",", ".")
    const numericValue = parseFloat(cleanValue) || 0
    onChange(numericValue / 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      return
    }
    // Allow Ctrl/Cmd + A, C, V, X
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) {
      return
    }
    // Allow digits and decimal point/comma
    if (!/^[\d.,]$/.test(e.key)) {
      e.preventDefault()
    }
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={isFocused ? inputValue : `${(value * 100).toFixed(2)}%`}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn("font-mono", className)}
      {...props}
    />
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate slider range from base value (10% to 200%)
 */
const calculateSliderRange = (base: number, isCurrency = false): { min: number; max: number; step: number } => {
  if (isCurrency) {
    return {
      min: Math.round(base * 0.1),
      max: Math.round(base * 2.0),
      step: 10000, // 10k step for currency
    }
  }
  return {
    min: base * 0.1,
    max: base * 2.0,
    step: Math.max(1, base * 0.01),
  }
}

// ============================================================================
// COMPACT PARAMETER ROW & ADJUSTMENT PANEL
// ============================================================================

const ParameterRow = ({
  label,
  tooltip,
  valueDisplay,
  slider,
  edit,
  extras,
  valueClassName,
  hint,
}: ParameterRowProps) => {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="py-1 border-b border-app-border/40 last:border-b-0">
      {/* Linha 1: rótulo + valor */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm text-app-muted leading-tight">{label}</span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoCircledIcon className="h-3.5 w-3.5 shrink-0 text-app-subtle hover:text-app-accent cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className="flex items-center gap-1.5">
          {isEditing && edit ? (
            <div className="w-[8.5rem]">
              {edit.type === "currency" && (
                <CurrencyInput
                  value={edit.value}
                  onChange={edit.onChange}
                  className="h-8 text-xs"
                />
              )}
              {edit.type === "percent" && (
                <PercentInput
                  value={edit.value}
                  onChange={edit.onChange}
                  className="h-8 text-xs"
                />
              )}
              {edit.type === "number" && (
                <Input
                  type="number"
                  value={edit.value}
                  onChange={(e) => edit.onChange(parseInt(e.target.value, 10) || 0)}
                  className="h-8 font-mono text-xs"
                />
              )}
            </div>
          ) : (
            <span
              className={cn(
                "font-mono text-sm tabular-nums whitespace-nowrap text-right",
                valueClassName ?? "text-app-fg"
              )}
            >
              {valueDisplay}
            </span>
          )}
          {edit && (
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              className={cn(
                "p-1.5 rounded-md text-app-subtle hover:text-app-accent hover:bg-app-bg transition-colors",
                isEditing && "text-app-accent bg-app-action/10"
              )}
              aria-label={isEditing ? "Fechar edição" : "Editar valor"}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          </div>
          {hint && !isEditing && (
            <span className="text-[10px] text-app-subtle leading-tight">{hint}</span>
          )}
        </div>
      </div>

      {/* Linha 2: slider em largura total */}
      {slider && (
        <Slider
          value={[slider.value]}
          onValueChange={([v]) => slider.onValueChange(v)}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          className="w-full py-0.5 touch-none [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-thumb]]:size-[18px]"
        />
      )}

      {/* Linha 3 (opcional): atalhos / chips */}
      {extras && <div className="mt-1 flex flex-wrap gap-1 items-center">{extras}</div>}
    </div>
  )
}

const ColumnHeader = ({ title }: { title: string }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-app-subtle mb-1 pb-0.5 border-b border-app-border/60">
    {title}
  </p>
)

/**
 * Compact 3-column adjustment panel for all simulator parameters.
 */
export const AdjustmentPanel = ({
  params,
  recursosMeta,
  onChange,
  onValueChange,
  onSliderChange,
  onCapitalChange,
  onReservaChange,
  onEntradaChange,
}: ParameterCardProps) => {
  const { settings } = useSettings()
  const prazoOptions = settings.prazoOptions
  const taxaAnualRange = settings.sliders.taxaAnual
  const trMensalRange = settings.sliders.trMensal
  const haircutRange = settings.sliders.haircut
  const aporteExtraRange = settings.sliders.aporteExtra
  const rendaMensalRange = settings.sliders.rendaMensal

  const reservaPct =
    recursosMeta?.reservaPctRecomendado ??
    calcularPctReservaRecomendada(params.valorImovelSelecionado)
  const reservaRecomendada =
    recursosMeta?.reservaRecomendada ??
    calcularReservaRecomendada(params.valorImovelSelecionado).valor
  const reservaTeto =
    recursosMeta?.reservaTeto ??
    Math.min(reservaRecomendada, params.capitalDisponivel)

  const tooltips = generateTooltips({
    taxaAnualRange,
    trMensalRange,
    prazoOptions,
    reservaPctRecomendado: reservaPct,
    haircutRange,
    aporteExtra: params.aporteExtra,
    aporteExtraRange,
    rendaMensalRange,
  })

  const entrada = params.capitalDisponivel - params.reservaEmergencia
  const valorImovelRange = calculateSliderRange(params.valorImovelBase, true)
  const capitalSlider = recursosMeta?.capitalSlider ?? {
    min: 0,
    max: Math.max(params.capitalDisponivel, 1_400_000),
    step: 10_000,
  }
  const valorAptoRange = calculateSliderRange(params.valorApartamentoBase, true)
  const custoCondominioRange = calculateSliderRange(params.custoCondominioBase, true)
  const segurosRange = calculateSliderRange(params.segurosBase, true)
  const prazoRange = calculateSliderRange(params.prazoMesesBase, false)

  return (
    <Card className="bg-app-surface-muted border-app-border">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg">Parâmetros da simulação</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-0">
          {/* Column 1 — Imóvel */}
          <div>
            <ColumnHeader title="Imóvel" />
            <ParameterRow
              label="Valor da Casa"
              tooltip={tooltips.valorImovel}
              valueDisplay={formatCurrency(params.valorImovelSelecionado)}
              slider={
                onSliderChange
                  ? {
                      value: params.valorImovelSelecionado,
                      min: valorImovelRange.min,
                      max: valorImovelRange.max,
                      step: valorImovelRange.step,
                      onValueChange: (v) =>
                        onSliderChange("valorImovel", v / params.valorImovelBase),
                    }
                  : undefined
              }
              edit={{
                type: "currency",
                value: params.valorImovelSelecionado,
                onChange: (v) =>
                  onValueChange
                    ? onValueChange("valorImovel", v)
                    : onChange({ ...params, valorImovelSelecionado: v }),
              }}
            />
            <ParameterRow
              label="Taxa Juros a.a."
              tooltip={tooltips.taxaAnual}
              valueDisplay={`${(params.taxaAnual * 100).toFixed(2)}%`}
              slider={{
                value: params.taxaAnual * 100,
                min: taxaAnualRange.min,
                max: taxaAnualRange.max,
                step: taxaAnualRange.step,
                onValueChange: (v) => onChange({ ...params, taxaAnual: v / 100 }),
              }}
              edit={{
                type: "percent",
                value: params.taxaAnual,
                onChange: (v) => onChange({ ...params, taxaAnual: v }),
              }}
            />
            <ParameterRow
              label="TR Mensal"
              tooltip={tooltips.trMensal}
              valueDisplay={`${(params.trMensal * 100).toFixed(2)}%`}
              slider={{
                value: params.trMensal * 100,
                min: trMensalRange.min,
                max: trMensalRange.max,
                step: trMensalRange.step,
                onValueChange: (v) => onChange({ ...params, trMensal: v / 100 }),
              }}
              edit={{
                type: "percent",
                value: params.trMensal,
                onChange: (v) => onChange({ ...params, trMensal: v }),
              }}
            />
            <ParameterRow
              label="Prazo"
              tooltip={tooltips.prazoMeses}
              valueDisplay={`${params.prazoMeses} meses`}
              slider={
                onSliderChange
                  ? {
                      value: params.prazoMeses,
                      min: prazoRange.min,
                      max: prazoRange.max,
                      step: prazoRange.step,
                      onValueChange: (v) =>
                        onSliderChange("prazoMeses", v / params.prazoMesesBase),
                    }
                  : undefined
              }
              edit={{
                type: "number",
                value: params.prazoMeses,
                onChange: (v) =>
                  onValueChange
                    ? onValueChange("prazoMeses", v)
                    : onChange({ ...params, prazoMeses: v }),
              }}
              extras={
                <div className="flex flex-wrap gap-1">
                  {prazoOptions.map((prazo) => (
                    <button
                      key={prazo}
                      type="button"
                      onClick={() =>
                        onValueChange
                          ? onValueChange("prazoMeses", prazo)
                          : onChange({ ...params, prazoMeses: prazo })
                      }
                      className={cn(
                        "px-2 py-0.5 text-[10px] rounded border transition-all",
                        params.prazoMeses === prazo
                          ? "bg-app-action text-app-action-foreground border-app-action font-semibold"
                          : "bg-app-bg border-app-border text-app-muted hover:border-app-action"
                      )}
                    >
                      {prazo / 12}a
                    </button>
                  ))}
                </div>
              }
            />
          </div>

          {/* Column 2 — Recursos */}
          <div>
            <ColumnHeader title="Recursos" />
            <ParameterRow
              label="Capital Disponível"
              tooltip={tooltips.capitalDisponivel}
              valueDisplay={formatCurrency(params.capitalDisponivel)}
              slider={
                onCapitalChange
                  ? {
                      value: params.capitalDisponivel,
                      min: capitalSlider.min,
                      max: capitalSlider.max,
                      step: capitalSlider.step,
                      onValueChange: onCapitalChange,
                    }
                  : undefined
              }
              edit={{
                type: "currency",
                value: params.capitalDisponivel,
                onChange: (v) =>
                  onCapitalChange
                    ? onCapitalChange(v)
                    : onValueChange
                      ? onValueChange("capitalDisponivel", v)
                      : onChange({ ...params, capitalDisponivel: v }),
              }}
            />
            <ParameterRow
              label="Reserva Emergência"
              tooltip={tooltips.reservaEmergencia}
              valueDisplay={formatCurrency(params.reservaEmergencia)}
              slider={
                onReservaChange
                  ? {
                      value: params.reservaEmergencia,
                      min: 0,
                      max: Math.max(reservaTeto, 1),
                      step: 5000,
                      onValueChange: onReservaChange,
                    }
                  : undefined
              }
              edit={
                onReservaChange
                  ? {
                      type: "currency",
                      value: params.reservaEmergencia,
                      onChange: onReservaChange,
                    }
                  : undefined
              }
            />
            <ParameterRow
              label="Entrada Disponível"
              tooltip={tooltips.entradaDisponivel}
              valueDisplay={formatCurrency(entrada)}
              valueClassName="text-app-accent font-semibold"
              slider={
                onEntradaChange
                  ? {
                      value: entrada,
                      min: 0,
                      max: Math.max(params.capitalDisponivel, 1),
                      step: 10000,
                      onValueChange: onEntradaChange,
                    }
                  : undefined
              }
              edit={
                onEntradaChange
                  ? {
                      type: "currency",
                      value: entrada,
                      onChange: onEntradaChange,
                    }
                  : undefined
              }
            />
          </div>

          {/* Column 3 — Comprador + Amortização */}
          <div className="md:col-span-2 xl:col-span-1">
            <ColumnHeader title="Comprador / Amortização" />
            <ParameterRow
              label="Valor Imóvel Atual"
              tooltip={tooltips.valorApartamento}
              valueDisplay={formatCurrency(params.valorApartamentoSelecionado)}
              slider={
                onSliderChange
                  ? {
                      value: params.valorApartamentoSelecionado,
                      min: valorAptoRange.min,
                      max: valorAptoRange.max,
                      step: valorAptoRange.step,
                      onValueChange: (v) =>
                        onSliderChange(
                          "valorApartamento",
                          v / params.valorApartamentoBase
                        ),
                    }
                  : undefined
              }
              edit={{
                type: "currency",
                value: params.valorApartamentoSelecionado,
                onChange: (v) =>
                  onValueChange
                    ? onValueChange("valorApartamento", v)
                    : onChange({ ...params, valorApartamentoSelecionado: v }),
              }}
            />
            <ParameterRow
              label="Haircut Permuta"
              tooltip={tooltips.haircut}
              valueDisplay={`${(params.haircut * 100).toFixed(0)}%`}
              slider={{
                value: params.haircut * 100,
                min: haircutRange.min,
                max: haircutRange.max,
                step: haircutRange.step,
                onValueChange: (v) => onChange({ ...params, haircut: v / 100 }),
              }}
            />
            <ParameterRow
              label="Condomínio/IPTU"
              tooltip="Custo mensal para manter o imóvel vazio durante o período de venda."
              valueDisplay={formatCurrency(params.custoCondominioMensal)}
              slider={
                onSliderChange
                  ? {
                      value: params.custoCondominioMensal,
                      min: custoCondominioRange.min,
                      max: custoCondominioRange.max,
                      step: custoCondominioRange.step,
                      onValueChange: (v) =>
                        onSliderChange(
                          "custoCondominio",
                          v / params.custoCondominioBase
                        ),
                    }
                  : undefined
              }
              edit={{
                type: "currency",
                value: params.custoCondominioMensal,
                onChange: (v) =>
                  onValueChange
                    ? onValueChange("custoCondominio", v)
                    : onChange({ ...params, custoCondominioMensal: v }),
              }}
            />
            <ParameterRow
              label="Aporte Extra"
              tooltip={tooltips.aporteExtra}
              valueDisplay={formatCurrency(params.aporteExtra)}
              slider={{
                value: params.aporteExtra,
                min: aporteExtraRange.min,
                max: aporteExtraRange.max,
                step: aporteExtraRange.step,
                onValueChange: (v) => onChange({ ...params, aporteExtra: v }),
              }}
              edit={{
                type: "currency",
                value: params.aporteExtra,
                onChange: (v) => onChange({ ...params, aporteExtra: v }),
              }}
            />
            <ParameterRow
              label="Renda Mensal"
              tooltip={tooltips.rendaMensal}
              valueDisplay={formatCurrency(params.rendaMensal)}
              slider={{
                value: params.rendaMensal,
                min: rendaMensalRange.min,
                max: rendaMensalRange.max,
                step: rendaMensalRange.step,
                onValueChange: (v) => onChange({ ...params, rendaMensal: v }),
              }}
              edit={{
                type: "currency",
                value: params.rendaMensal,
                onChange: (v) => onChange({ ...params, rendaMensal: v }),
              }}
            />
            <ParameterRow
              label="Seguros MIP+DFI"
              tooltip={`Seguros obrigatórios (MIP + DFI). Valor atual: ${formatCurrency(params.seguros)}/mês.`}
              valueDisplay={formatCurrency(params.seguros)}
              slider={
                onSliderChange
                  ? {
                      value: params.seguros,
                      min: segurosRange.min,
                      max: segurosRange.max,
                      step: segurosRange.step,
                      onValueChange: (v) =>
                        onSliderChange("seguros", v / params.segurosBase),
                    }
                  : undefined
              }
              edit={{
                type: "currency",
                value: params.seguros,
                onChange: (v) =>
                  onValueChange
                    ? onValueChange("seguros", v)
                    : onChange({ ...params, seguros: v }),
              }}
            />
          </div>
        </div>
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
    <Card className="bg-app-surface border-app-border">
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
                    ? "bg-app-action/20 text-app-accent border-app-action"
                    : "bg-app-bg border-app-border text-app-subtle"
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
                    : "bg-app-bg border-app-border text-app-subtle"
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
                    : "bg-app-bg border-app-border text-app-subtle"
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
