import { Suspense } from "react"
import { CollectionsProvider } from "@/app/anuncios/lib/use-collections"
import { ExplorarClient } from "./explorar-client"

export default function ExplorarPage() {
  return (
    <CollectionsProvider>
      <Suspense fallback={<div className="p-8 text-sm text-app-muted">Carregando…</div>}>
        <ExplorarClient />
      </Suspense>
    </CollectionsProvider>
  )
}
