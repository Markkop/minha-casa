"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { InfoCircledIcon } from "@radix-ui/react-icons"

import { formatCurrency, TOOLTIPS } from "./utils/calculations"

/**
 * Campo com tooltip informativo
 */
const FieldWithTooltip = ({ label, tooltip, children, className }) => {
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
const CurrencyInput = ({ value, onChange, ...props }) => {
  const handleChange = (e) => {
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
const PercentInput = ({ value, onChange, ...props }) => {
  const handleChange = (e) => {
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

/**
 * Card de parâmetros do imóvel
 */
export const ImovelParameterCard = ({ params, onChange }) => {
  const presets = [1960000, 1900000, 1800000]

  return (
    <Card className="bg-eerieBlack border-brightGrey">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          Imóvel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldWithTooltip label="Valor da Casa" tooltip={TOOLTIPS.valorImovel}>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() =>
                    onChange({ ...params, valorImovelSelecionado: preset })
                  }
                  className={cn(
                    "px-3 py-1 text-xs rounded-md border transition-all",
                    params.valorImovelSelecionado === preset
                      ? "bg-primary text-black border-primary font-bold"
                      : "bg-middleGray50 border-brightGrey text-ashGray hover:border-primary"
                  )}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
            <CurrencyInput
              value={params.valorImovelSelecionado}
              onChange={(v) =>
                onChange({ ...params, valorImovelSelecionado: v })
              }
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Taxa de Juros Anual"
          tooltip={TOOLTIPS.taxaAnual}
        >
          <div className="space-y-2">
            <Slider
              value={[params.taxaAnual * 100]}
              onValueChange={([v]) =>
                onChange({ ...params, taxaAnual: v / 100 })
              }
              min={9}
              max={15}
              step={0.1}
              className="py-2"
            />
            <PercentInput
              value={params.taxaAnual}
              onChange={(v) => onChange({ ...params, taxaAnual: v })}
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip label="TR Mensal" tooltip={TOOLTIPS.trMensal}>
          <div className="space-y-2">
            <Slider
              value={[params.trMensal * 100]}
              onValueChange={([v]) =>
                onChange({ ...params, trMensal: v / 100 })
              }
              min={0}
              max={0.5}
              step={0.01}
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
          tooltip={TOOLTIPS.prazoMeses}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              {[240, 300, 360, 420].map((prazo) => (
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
export const RecursosParameterCard = ({ params, onChange }) => {
  const entrada = params.capitalDisponivel - params.reservaEmergencia

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
          tooltip={TOOLTIPS.capitalDisponivel}
        >
          <CurrencyInput
            value={params.capitalDisponivel}
            onChange={(v) => onChange({ ...params, capitalDisponivel: v })}
          />
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Reserva de Emergência"
          tooltip={TOOLTIPS.reservaEmergencia}
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
 * Card de parâmetros do apartamento
 */
export const ApartamentoParameterCard = ({ params, onChange }) => {
  const presets = [550000, 500000, 450000]

  return (
    <Card className="bg-eerieBlack border-brightGrey">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🏢</span>
          Apartamento Secundário
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldWithTooltip
          label="Valor do Apartamento"
          tooltip={TOOLTIPS.valorApartamento}
        >
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() =>
                    onChange({ ...params, valorApartamentoSelecionado: preset })
                  }
                  className={cn(
                    "px-3 py-1 text-xs rounded-md border transition-all",
                    params.valorApartamentoSelecionado === preset
                      ? "bg-salmon text-black border-salmon font-bold"
                      : "bg-middleGray50 border-brightGrey text-ashGray hover:border-salmon"
                  )}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
            <CurrencyInput
              value={params.valorApartamentoSelecionado}
              onChange={(v) =>
                onChange({ ...params, valorApartamentoSelecionado: v })
              }
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Haircut (Deságio Permuta)"
          tooltip={TOOLTIPS.haircut}
        >
          <div className="space-y-2">
            <Slider
              value={[params.haircut * 100]}
              onValueChange={([v]) =>
                onChange({ ...params, haircut: v / 100 })
              }
              min={5}
              max={30}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-dimGray">
              <span>5%</span>
              <span className="text-ashGray font-mono">
                {(params.haircut * 100).toFixed(0)}%
              </span>
              <span>30%</span>
            </div>
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Custo Condomínio/IPTU Mensal"
          tooltip="Custo mensal para manter o apartamento vazio durante o período de venda."
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
export const AmortizacaoParameterCard = ({ params, onChange }) => {
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
          tooltip={TOOLTIPS.aporteExtra}
        >
          <div className="space-y-2">
            <Slider
              value={[params.aporteExtra]}
              onValueChange={([v]) => onChange({ ...params, aporteExtra: v })}
              min={0}
              max={30000}
              step={1000}
              className="py-2"
            />
            <CurrencyInput
              value={params.aporteExtra}
              onChange={(v) => onChange({ ...params, aporteExtra: v })}
            />
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip label="Renda Mensal" tooltip={TOOLTIPS.rendaMensal}>
          <div className="space-y-2">
            <Slider
              value={[params.rendaMensal]}
              onValueChange={([v]) => onChange({ ...params, rendaMensal: v })}
              min={30000}
              max={80000}
              step={1000}
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
          tooltip="Seguros obrigatórios: Morte e Invalidez Permanente (MIP) e Danos Físicos ao Imóvel (DFI). Estimativa para perfil 40 anos."
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
export const FiltrosCenarioCard = ({ params, onChange }) => {
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
          label="Valores do Imóvel"
          tooltip="Selecione quais valores de imóvel mostrar na comparação."
        >
          <div className="flex gap-2 flex-wrap">
            {[1960000, 1900000, 1800000].map((valor) => (
              <button
                key={valor}
                onClick={() => {
                  const current = params.valoresImovelFiltro || [1960000, 1900000, 1800000]
                  const updated = current.includes(valor)
                    ? current.filter((v) => v !== valor)
                    : [...current, valor]
                  onChange({ ...params, valoresImovelFiltro: updated })
                }}
                className={cn(
                  "px-3 py-1 text-xs rounded-md border transition-all",
                  (params.valoresImovelFiltro || [1960000, 1900000, 1800000]).includes(valor)
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-middleGray50 border-brightGrey text-dimGray"
                )}
              >
                {formatCurrency(valor)}
              </button>
            ))}
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Valores do Apartamento"
          tooltip="Selecione quais valores de apartamento mostrar na comparação."
        >
          <div className="flex gap-2 flex-wrap">
            {[550000, 500000, 450000].map((valor) => (
              <button
                key={valor}
                onClick={() => {
                  const current = params.valoresAptoFiltro || [550000, 500000, 450000]
                  const updated = current.includes(valor)
                    ? current.filter((v) => v !== valor)
                    : [...current, valor]
                  onChange({ ...params, valoresAptoFiltro: updated })
                }}
                className={cn(
                  "px-3 py-1 text-xs rounded-md border transition-all",
                  (params.valoresAptoFiltro || [550000, 500000, 450000]).includes(valor)
                    ? "bg-salmon/20 text-salmon border-salmon"
                    : "bg-middleGray50 border-brightGrey text-dimGray"
                )}
              >
                {formatCurrency(valor)}
              </button>
            ))}
          </div>
        </FieldWithTooltip>

        <FieldWithTooltip
          label="Estratégias"
          tooltip={TOOLTIPS.estrategia}
        >
          <div className="flex gap-2">
            {[
              { value: "permuta", label: "Permuta" },
              { value: "venda_posterior", label: "Venda Posterior" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  const current = params.estrategiasFiltro || ["permuta", "venda_posterior"]
                  const updated = current.includes(value)
                    ? current.filter((v) => v !== value)
                    : [...current, value]
                  onChange({ ...params, estrategiasFiltro: updated })
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

