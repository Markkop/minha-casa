import { Suspense } from "react"
import { ConectarTelegramClient } from "./conectar-telegram-client"

export default function ConectarTelegramPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
          <p className="text-app-muted">Carregando…</p>
        </div>
      }
    >
      <ConectarTelegramClient />
    </Suspense>
  )
}
