import type { Metadata } from "next"
import { CollectionsProvider } from "@/app/anuncios/lib/use-collections"
import { OverviewClient } from "./overview-client"

export const metadata: Metadata = {
  title: "Visão geral | Minha Casa",
}

export default function VisaoGeralPage() {
  return (
    <CollectionsProvider>
      <OverviewClient />
    </CollectionsProvider>
  )
}
