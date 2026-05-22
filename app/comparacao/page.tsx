import type { Metadata } from "next"
import { CollectionsProvider } from "@/app/anuncios/lib/use-collections"
import { ComparisonClient } from "./comparison-client"

export const metadata: Metadata = {
  title: "Comparação | Minha Casa",
}

export default function ComparacaoPage() {
  return (
    <CollectionsProvider>
      <ComparisonClient />
    </CollectionsProvider>
  )
}
