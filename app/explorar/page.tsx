import { Suspense } from "react"
import { ExplorarClient } from "./explorar-client"

export default function ExplorarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-app-muted">Carregando...</div>}>
      <ExplorarClient />
    </Suspense>
  )
}
