import { Suspense } from "react"
import { ConectarWhatsAppClient } from "./conectar-whatsapp-client"

export default function ConectarWhatsAppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
          <p className="text-app-muted">Carregando…</p>
        </div>
      }
    >
      <ConectarWhatsAppClient />
    </Suspense>
  )
}
