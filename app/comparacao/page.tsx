import type { Metadata } from "next"
import { ComparisonClient } from "./comparison-client"

export const metadata: Metadata = {
  title: "Comparação | Minha Casa",
}

export default function ComparacaoPage() {
  return <ComparisonClient />
}
