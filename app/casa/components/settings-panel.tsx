"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Cross2Icon, GearIcon, ResetIcon } from "@radix-ui/react-icons"
import { useState } from "react"

import {
  DEFAULT_SETTINGS,
  useSettings,
  type SimulatorSettings,
  type SliderRange,
} from "./utils/settings"

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

const NumberInput = ({ value, onChange, min, max, step, className }: NumberInputProps) => {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
      className={cn("font-mono w-24", className)}
    />
  )
}

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

const CurrencyInput = ({ value, onChange, className }: CurrencyInputProps) => {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      step={10000}
      className={cn("font-mono w-32", className)}
    />
  )
}

interface SliderRangeInputProps {
  label: string
  range: SliderRange
  onChange: (range: SliderRange) => void
  isPercent?: boolean
  isCurrency?: boolean
}

const SliderRangeInput = ({
  label,
  range,
  onChange,
  isPercent = false,
  isCurrency = false,
}: SliderRangeInputProps) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-ashGray">{label}</Label>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-xs text-dimGray w-8">Min:</span>
          <NumberInput
            value={range.min}
            onChange={(v) => onChange({ ...range, min: v })}
            step={range.step}
          />
          {isPercent && <span className="text-xs text-dimGray">%</span>}
          {isCurrency && <span className="text-xs text-dimGray">R$</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-dimGray w-8">Max:</span>
          <NumberInput
            value={range.max}
            onChange={(v) => onChange({ ...range, max: v })}
            step={range.step}
          />
          {isPercent && <span className="text-xs text-dimGray">%</span>}
          {isCurrency && <span className="text-xs text-dimGray">R$</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-dimGray w-8">Step:</span>
          <NumberInput
            value={range.step}
            onChange={(v) => onChange({ ...range, step: v })}
            step={0.01}
            className="w-20"
          />
        </div>
      </div>
    </div>
  )
}

interface ValueListInputProps {
  label: string
  values: number[]
  onChange: (values: number[]) => void
  isCurrency?: boolean
}

const ValueListInput = ({
  label,
  values,
  onChange,
  isCurrency = false,
}: ValueListInputProps) => {
  const addValue = () => {
    const lastValue = values[values.length - 1] || 0
    onChange([...values, lastValue])
  }

  const removeValue = (index: number) => {
    if (values.length > 1) {
      onChange(values.filter((_, i) => i !== index))
    }
  }

  const updateValue = (index: number, value: number) => {
    const newValues = [...values]
    newValues[index] = value
    onChange(newValues)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm text-ashGray">{label}</Label>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            {isCurrency ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-dimGray">R$</span>
                <CurrencyInput
                  value={value}
                  onChange={(v) => updateValue(index, v)}
                />
              </div>
            ) : (
              <NumberInput
                value={value}
                onChange={(v) => updateValue(index, v)}
              />
            )}
            <button
              onClick={() => removeValue(index)}
              disabled={values.length === 1}
              className="p-1 rounded hover:bg-brightGrey disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Cross2Icon className="h-4 w-4 text-dimGray hover:text-salmon" />
            </button>
          </div>
        ))}
        <button
          onClick={addValue}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          + Adicionar valor
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsPanel = ({ isOpen, onClose }: SettingsPanelProps) => {
  const { settings, updateSettings, resetSettings } = useSettings()
  const [localSettings, setLocalSettings] = useState<SimulatorSettings>(settings)

  // Note: handleOpen callback was removed as unused. If panel needs to sync on open,
  // consider using useEffect with isOpen dependency.

  if (!isOpen) return null

  const handleSave = () => {
    updateSettings(localSettings)
    onClose()
  }

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS)
    resetSettings()
  }

  const handleCancel = () => {
    setLocalSettings(settings)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-8"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-raisinBlack border-brightGrey">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <GearIcon className="h-5 w-5" />
              Configurações do Simulador
            </CardTitle>
            <button
              onClick={handleCancel}
              className="p-2 rounded hover:bg-brightGrey transition-colors"
            >
              <Cross2Icon className="h-5 w-5 text-ashGray" />
            </button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CET */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">
                CET - Custo Efetivo Total
              </Label>
              <p className="text-xs text-dimGray mb-2">
                Custo adicional estimado (seguros, taxas) a ser adicionado ao cálculo do CET.
              </p>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={localSettings.cetAdditionalCost * 100}
                  onChange={(v) =>
                    setLocalSettings({ ...localSettings, cetAdditionalCost: v / 100 })
                  }
                  step={0.1}
                  min={0}
                  max={10}
                />
                <span className="text-sm text-dimGray">% a.a.</span>
              </div>
            </div>

            {/* Prazos */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">
                Opções de Prazo (meses)
              </Label>
              <p className="text-xs text-dimGray mb-2">
                Prazos disponíveis para seleção rápida no simulador.
              </p>
              <ValueListInput
                label=""
                values={localSettings.prazoOptions}
                onChange={(values) =>
                  setLocalSettings({ ...localSettings, prazoOptions: values.sort((a, b) => a - b) })
                }
              />
            </div>

            {/* Slider Ranges */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-primary">
                Limites dos Sliders
              </Label>
              <p className="text-xs text-dimGray mb-2">
                Configure os valores mínimos, máximos e incrementos de cada slider.
              </p>

              <SliderRangeInput
                label="Taxa de Juros Anual"
                range={localSettings.sliders.taxaAnual}
                onChange={(range) =>
                  setLocalSettings({
                    ...localSettings,
                    sliders: { ...localSettings.sliders, taxaAnual: range },
                  })
                }
                isPercent
              />

              <SliderRangeInput
                label="TR Mensal"
                range={localSettings.sliders.trMensal}
                onChange={(range) =>
                  setLocalSettings({
                    ...localSettings,
                    sliders: { ...localSettings.sliders, trMensal: range },
                  })
                }
                isPercent
              />

              <SliderRangeInput
                label="Haircut (Deságio Permuta)"
                range={localSettings.sliders.haircut}
                onChange={(range) =>
                  setLocalSettings({
                    ...localSettings,
                    sliders: { ...localSettings.sliders, haircut: range },
                  })
                }
                isPercent
              />

              <SliderRangeInput
                label="Aporte Extra Mensal"
                range={localSettings.sliders.aporteExtra}
                onChange={(range) =>
                  setLocalSettings({
                    ...localSettings,
                    sliders: { ...localSettings.sliders, aporteExtra: range },
                  })
                }
                isCurrency
              />

              <SliderRangeInput
                label="Renda Mensal"
                range={localSettings.sliders.rendaMensal}
                onChange={(range) =>
                  setLocalSettings({
                    ...localSettings,
                    sliders: { ...localSettings.sliders, rendaMensal: range },
                  })
                }
                isCurrency
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-brightGrey">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm text-salmon hover:text-salmon/80 transition-colors"
              >
                <ResetIcon className="h-4 w-4" />
                Restaurar Padrões
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm text-ashGray hover:text-white border border-brightGrey rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm bg-primary text-black font-semibold rounded-md hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// SETTINGS BUTTON
// ============================================================================

interface SettingsButtonProps {
  onClick: () => void
}

export const SettingsButton = ({ onClick }: SettingsButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-md border border-brightGrey hover:border-primary hover:bg-primary/10 transition-all"
      title="Configurações"
    >
      <GearIcon className="h-5 w-5 text-ashGray hover:text-primary" />
    </button>
  )
}


