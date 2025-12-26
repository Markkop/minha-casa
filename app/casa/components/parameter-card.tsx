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
import { useState, useEffect, type ReactNode } from "react"

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
  onValueChange?: (
    field:
      | "valorImovel"
      | "capitalDisponivel"
      | "reservaEmergencia"
      | "valorApartamento"
      | "custoCondominio"
      | "seguros"
      | "prazoMeses",
    newValue: number
  ) => void
  onSliderChange?: (
    field:
      | "valorImovel"
      | "capitalDisponivel"
      | "reservaEmergencia"
      | "valorApartamento"
      | "custoCondominio"
      | "seguros"
      | "prazoMeses",
    multiplier: number
  ) => void
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
 * Input monetário formatado - shows raw value while editing, formatted on blur
 */
const CurrencyInput = ({ value, onChange, ...props }: CurrencyInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())

  // Sync inputValue with external value when not focused
  useEffect(() => {
    if (!isFocused) {
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
      className="font-mono"
      {...props}
    />
  )
}

/**
 * Input percentual - shows raw value while editing, formatted on blur
 */
const PercentInput = ({ value, onChange, ...props }: PercentInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [inputValue, setInputValue] = useState((value * 100).toFixed(2))

  // Sync inputValue with external value when not focused
  useEffect(() => {
    if (!isFocused) {
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
      className="font-mono"
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

/**
 * Format multiplier as percentage
 */
const formatPercentage = (multiplier: number): string => {
  return `${(multiplier * 100).toFixed(0)}%`
}

// ============================================================================
// PARAMETER CARDS
// ============================================================================

/**
 * Card de parâmetros do imóvel
 */
export const ImovelParameterCard = ({ params, onChange, onValueChange, onSliderChange }: ParameterCardProps) => {
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

  const valorImovelRange = calculateSliderRange(params.valorImovelBase, true)
  const prazoRange = calculateSliderRange(params.prazoMesesBase, false)

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
          <div className="space-y-2">
            {onSliderChange && (
              <Slider
                value={[params.valorImovelSelecionado]}
                onValueChange={([v]) => {
                  const multiplier = v / params.valorImovelBase
                  onSliderChange("valorImovel", multiplier)
                }}
                min={valorImovelRange.min}
                max={valorImovelRange.max}
                step={valorImovelRange.step}
                className="py-2"
              />
            )}
            <div className="flex justify-between text-xs text-dimGray">
              {onSliderChange && (
                <>
                  <span>{formatCurrency(valorImovelRange.min)}</span>
                  <span className="text-ashGray font-mono">
                    {formatPercentage(params.valorImovelMultiplier)}
                  </span>
                  <span>{formatCurrency(valorImovelRange.max)}</span>
                </>
              )}
            </div>
            <CurrencyInput
              value={params.valorImovelSelecionado}
              onChange={(v) => {
                if (onValueChange) {
                  onValueChange("valorImovel", v)
                } else {
                  onChange({ ...params, valorImovelSelecionado: v })
                }
              }}
            />
          </div>
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
            {onSliderChange && (
              <Slider
                value={[params.prazoMeses]}
                onValueChange={([v]) => {
                  const multiplier = v / params.prazoMesesBase
                  onSliderChange("prazoMeses", multiplier)
                }}
                min={prazoRange.min}
                max={prazoRange.max}
                step={prazoRange.step}
                className="py-2"
              />
            )}
            {onSliderChange && (
              <div className="flex justify-between text-xs text-dimGray">
                <span>{Math.round(prazoRange.min)} meses</span>
                <span className="text-ashGray font-mono">
                  {formatPercentage(params.prazoMesesMultiplier)}
                </span>
                <span>{Math.round(prazoRange.max)} meses</span>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {prazoOptions.map((prazo) => (
                <button
                  key={prazo}
                  onClick={() => {
                    if (onValueChange) {
                      onValueChange("prazoMeses", prazo)
                    } else {
                      onChange({ ...params, prazoMeses: prazo })
                    }
                  }}
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
              onChange={(e) => {
                const value = parseInt(e.target.value) || 360
                if (onValueChange) {
                  onValueChange("prazoMeses", value)
                } else {
                  onChange({ ...params, prazoMeses: value })
                }
              }}
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
export const RecursosParameterCard = ({ params, onChange, onValueChange, onSliderChange }: ParameterCardProps) => {
  const entrada = params.capitalDisponivel - params.reservaEmergencia

  // Generate dynamic tooltips
  const tooltips = generateTooltips({
    reservaEmergencia: params.reservaEmergencia,
  })

  const capitalRange = calculateSliderRange(params.capitalDisponivelBase, true)
  const reservaRange = calculateSliderRange(params.reservaEmergenciaBase, true)

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
          <div className="space-y-2">
            {onSliderChange && (
              <Slider
                value={[params.capitalDisponivel]}
                onValueChange={([v]) => {
                  const multiplier = v / params.capitalDisponivelBase
                  onSliderChange("capitalDisponivel", multiplier)
                }}
                min={capitalRange.min}
                max={capitalRange.max}
                step={capitalRange.step}
                className="py-2"
              />
            )}
            {onSliderChange && (
              <div className="flex justify-between text-xs text-dimGray">
                <span>{formatCurrency(capitalRange.min)}</span>
                <span className="text-ashGray font-mono">
                  {formatPercentage(params.capitalDisponivelMultiplier)}
                </span>
                <span>{formatCurrency(capitalRange.max)}</span>
              </div>
            )}
            <CurrencyInput
              value={params.capitalDisponivel}
              onChange={(v) => {
                if (onValueChange) {
                  onValueChange("capitalDisponivel", v)
                } else {
                  onChange({ ...params, capitalDisponivel: v })
                }
              }}
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Reserva de Emergência"
          tooltip={tooltips.reservaEmergencia}
        >
          <div className="space-y-2">
            {onSliderChange && (
              <Slider
                value={[params.reservaEmergencia]}
                onValueChange={([v]) => {
                  const multiplier = v / params.reservaEmergenciaBase
                  onSliderChange("reservaEmergencia", multiplier)
                }}
                min={reservaRange.min}
                max={reservaRange.max}
                step={reservaRange.step}
                className="py-2"
              />
            )}
            {onSliderChange && (
              <div className="flex justify-between text-xs text-dimGray">
                <span>{formatCurrency(reservaRange.min)}</span>
                <span className="text-ashGray font-mono">
                  {formatPercentage(params.reservaEmergenciaMultiplier)}
                </span>
                <span>{formatCurrency(reservaRange.max)}</span>
              </div>
            )}
            <CurrencyInput
              value={params.reservaEmergencia}
              onChange={(v) => {
                if (onValueChange) {
                  onValueChange("reservaEmergencia", v)
                } else {
                  onChange({ ...params, reservaEmergencia: v })
                }
              }}
            />
          </div>
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
export const ImovelCompradorParameterCard = ({ params, onChange, onValueChange, onSliderChange }: ParameterCardProps) => {
  const { settings } = useSettings()
  const haircutRange = settings.sliders.haircut

  // Generate dynamic tooltips
  const tooltips = generateTooltips({
    haircutRange,
  })

  const valorAptoRange = calculateSliderRange(params.valorApartamentoBase, true)
  const custoCondominioRange = calculateSliderRange(params.custoCondominioBase, true)

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
          <div className="space-y-2">
            {onSliderChange && (
              <Slider
                value={[params.valorApartamentoSelecionado]}
                onValueChange={([v]) => {
                  const multiplier = v / params.valorApartamentoBase
                  onSliderChange("valorApartamento", multiplier)
                }}
                min={valorAptoRange.min}
                max={valorAptoRange.max}
                step={valorAptoRange.step}
                className="py-2"
              />
            )}
            {onSliderChange && (
              <div className="flex justify-between text-xs text-dimGray">
                <span>{formatCurrency(valorAptoRange.min)}</span>
                <span className="text-ashGray font-mono">
                  {formatPercentage(params.valorApartamentoMultiplier)}
                </span>
                <span>{formatCurrency(valorAptoRange.max)}</span>
              </div>
            )}
            <CurrencyInput
              value={params.valorApartamentoSelecionado}
              onChange={(v) => {
                if (onValueChange) {
                  onValueChange("valorApartamento", v)
                } else {
                  onChange({ ...params, valorApartamentoSelecionado: v })
                }
              }}
            />
          </div>
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
          <div className="space-y-2">
            {onSliderChange && (
              <Slider
                value={[params.custoCondominioMensal]}
                onValueChange={([v]) => {
                  const multiplier = v / params.custoCondominioBase
                  onSliderChange("custoCondominio", multiplier)
                }}
                min={custoCondominioRange.min}
                max={custoCondominioRange.max}
                step={custoCondominioRange.step}
                className="py-2"
              />
            )}
            {onSliderChange && (
              <div className="flex justify-between text-xs text-dimGray">
                <span>{formatCurrency(custoCondominioRange.min)}</span>
                <span className="text-ashGray font-mono">
                  {formatPercentage(params.custoCondominioMultiplier)}
                </span>
                <span>{formatCurrency(custoCondominioRange.max)}</span>
              </div>
            )}
            <CurrencyInput
              value={params.custoCondominioMensal}
              onChange={(v) => {
                if (onValueChange) {
                  onValueChange("custoCondominio", v)
                } else {
                  onChange({ ...params, custoCondominioMensal: v })
                }
              }}
            />
          </div>
        </FieldWithTooltip>
      </CardContent>
    </Card>
  )
}

/**
 * Card de parâmetros de amortização
 */
export const AmortizacaoParameterCard = ({ params, onChange, onValueChange, onSliderChange }: ParameterCardProps) => {
  const { settings } = useSettings()
  const aporteExtraRange = settings.sliders.aporteExtra
  const rendaMensalRange = settings.sliders.rendaMensal

  // Generate dynamic tooltips
  const tooltips = generateTooltips({
    aporteExtra: params.aporteExtra,
    aporteExtraRange,
    rendaMensalRange,
  })

  const segurosRange = calculateSliderRange(params.segurosBase, true)

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
          <div className="space-y-2">
            {onSliderChange && (
              <Slider
                value={[params.seguros]}
                onValueChange={([v]) => {
                  const multiplier = v / params.segurosBase
                  onSliderChange("seguros", multiplier)
                }}
                min={segurosRange.min}
                max={segurosRange.max}
                step={segurosRange.step}
                className="py-2"
              />
            )}
            {onSliderChange && (
              <div className="flex justify-between text-xs text-dimGray">
                <span>{formatCurrency(segurosRange.min)}</span>
                <span className="text-ashGray font-mono">
                  {formatPercentage(params.segurosMultiplier)}
                </span>
                <span>{formatCurrency(segurosRange.max)}</span>
              </div>
            )}
            <CurrencyInput
              value={params.seguros}
              onChange={(v) => {
                if (onValueChange) {
                  onValueChange("seguros", v)
                } else {
                  onChange({ ...params, seguros: v })
                }
              }}
            />
          </div>
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
