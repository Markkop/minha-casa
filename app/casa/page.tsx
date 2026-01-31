import type { Metadata } from "next"
import { Suspense } from "react"
import { SimulatorClient } from "./components/simulator-client"
import { SettingsProvider } from "./components/utils/settings"
import { AddonGuard } from "@/components/addon-guard"

export const metadata: Metadata = {
  title: "Simulador de Financiamento | Casa",
  description:
    "Simulador completo de financiamento imobiliário com sistema SAC, análise de cenários e estratégias de amortização.",
}

export default function CasaPage() {
  return (
    <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
      <SettingsProvider>
        <Suspense fallback={
          <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <p className="text-ashGray">Carregando...</p>
          </div>
        }>
          <SimulatorClient />
        </Suspense>
      </SettingsProvider>
    </AddonGuard>
  )
}
