import type { Metadata } from "next"
import { SimulatorClient } from "./components/simulator-client"

export const metadata: Metadata = {
  title: "Simulador de Financiamento | Casa",
  description:
    "Simulador completo de financiamento imobiliário com sistema SAC, análise de cenários e estratégias de amortização.",
}

export default function CasaPage() {
  return <SimulatorClient />
}

