import type { Metadata } from "next"
import { Suspense } from "react"
import { SimulatorClient } from "@/app/casa/components/simulator-client"
import { SettingsProvider } from "@/app/casa/components/utils/settings"

export const metadata: Metadata = {
  title: "Financiamento | Minha Casa",
  description:
    "Simulador de financiamento imobiliário com cenários, amortização e análise de compra.",
}

export default function FinanciamentoPage() {
  return (
    <SettingsProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-app-bg text-app-fg flex items-center justify-center">
            <p className="text-app-muted">Carregando...</p>
          </div>
        }
      >
        <SimulatorClient />
      </Suspense>
    </SettingsProvider>
  )
}
