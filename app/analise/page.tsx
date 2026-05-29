import type { Metadata } from "next"
import { AnaliseClient } from "./analise-client"

export const metadata: Metadata = {
  title: "Análise | Minha Casa",
  description: "Análise detalhada de imóveis com pesquisa profunda assistida por IA",
}

export default function AnalisePage() {
  return <AnaliseClient />
}
