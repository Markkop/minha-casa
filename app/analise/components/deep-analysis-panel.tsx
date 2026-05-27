"use client"

import { useState } from "react"
import { Loader2, ScanSearch } from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePropertyAnalysis } from "@/lib/property-analysis/use-property-analysis"
import {
  isLegacyAnalysisResult,
  isStaleConfigResult,
} from "@/lib/property-analysis/stale-result"
import { AnalysisSections } from "./analysis-sections"
import { cn } from "@/lib/utils"

function hasGeocodableAddress(listing: Imovel) {
  if (listing.customLat != null && listing.customLng != null) return true
  const parts = [listing.endereco, listing.bairro, listing.cidade].filter(
    (p) => typeof p === "string" && p.trim() !== ""
  )
  return parts.length > 0
}

interface DeepAnalysisPanelProps {
  listing: Imovel
  orgId?: string | null
}

export function DeepAnalysisPanel({ listing, orgId }: DeepAnalysisPanelProps) {
  const {
    analysis,
    isLoading,
    isStarting,
    isRunning,
    error,
    runAnalysis,
    refresh,
    retryStep,
    retryAmbienteXray,
  } = usePropertyAnalysis(listing.id, orgId)

  const needsAddress = !hasGeocodableAddress(listing)
  const [addressOverride, setAddressOverride] = useState("")
  const [skipAddress, setSkipAddress] = useState(false)

  const staleResult =
    analysis?.status === "completed" &&
    isStaleConfigResult(analysis.result ?? null)

  const legacyResult =
    analysis?.result != null && isLegacyAnalysisResult(analysis.result)

  const handleRun = () => {
    const override =
      needsAddress && !skipAddress ? addressOverride.trim() : undefined
    void runAnalysis(override || undefined)
  }

  return (
    <div className="space-y-4">
      <WorkspacePanel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-app-fg">
              <ScanSearch className="size-4" />
              Análise profunda
            </h2>
            <p className="mt-1 max-w-xl text-sm text-app-muted">
              Pesquisa de clima, riscos naturais e mercado; reconhecimento dos ambientes
              pelas fotos; estimativa de idade e orçamento por ponto de atenção. Os cards
              aparecem conforme cada etapa termina.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleRun}
              disabled={isStarting || isRunning}
              className="gap-2"
            >
              {(isStarting || isRunning) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isRunning
                ? "Analisando..."
                : analysis?.status === "completed"
                  ? "Executar nova análise"
                  : "Iniciar análise profunda"}
            </Button>
            {analysis && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refresh(analysis.id)}
                disabled={isLoading}
              >
                Atualizar
              </Button>
            )}
          </div>
        </div>

        {needsAddress && (
          <div className="mt-4 rounded-lg border border-app-border bg-app-bg p-3">
            <p className="text-xs text-app-muted">
              Sem endereço ou coordenadas — a busca de proximidades será limitada. Informe um
              endereço completo ou continue sem.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <Label htmlFor="address-override" className="text-xs">
                  Endereço (opcional)
                </Label>
                <Input
                  id="address-override"
                  value={addressOverride}
                  onChange={(e) => setAddressOverride(e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                  className="mt-1 h-8 text-sm"
                  disabled={skipAddress}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-app-muted">
                <input
                  type="checkbox"
                  checked={skipAddress}
                  onChange={(e) => setSkipAddress(e.target.checked)}
                  className="rounded border-app-border"
                />
                Continuar sem endereço
              </label>
            </div>
          </div>
        )}

        {(staleResult || legacyResult) && !isRunning && (
          <p
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            role="status"
          >
            {legacyResult
              ? "Este resultado usa o formato antigo da análise."
              : "Este resultado foi gerado antes das chaves de API estarem ativas no servidor."}{" "}
            Clique em <strong>Executar nova análise</strong> para refazer.
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {analysis?.status === "failed" && analysis.error && (
          <p className="mt-3 text-sm text-destructive">{analysis.error}</p>
        )}
      </WorkspacePanel>

      <AnalysisSections
        result={analysis?.result ?? null}
        isRunning={isRunning}
        listing={listing}
        className={cn(isLoading && !analysis && "opacity-60")}
        onRetryStep={(step) => void retryStep(step)}
        onRetryAmbienteXray={(ambienteId) => void retryAmbienteXray(ambienteId)}
      />
    </div>
  )
}
