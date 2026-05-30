import type { Metadata } from "next"
import { Suspense } from "react"
import { SimulatorClient } from "@/app/casa/components/simulator-client"
import { SettingsProvider } from "@/app/casa/components/utils/settings"
import { WorkspaceLoadingState } from "@/app/components/workspace-ui"

export const metadata: Metadata = {
  title: "Financiamento | Minha Casa",
  description:
    "Simulador de financiamento imobiliário com cenários, amortização e análise de compra.",
}

export default function FinanciamentoPage() {
  return (
    <SettingsProvider>
      <Suspense fallback={<WorkspaceLoadingState />}>
        <SimulatorClient />
      </Suspense>
    </SettingsProvider>
  )
}
