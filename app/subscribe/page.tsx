import { Suspense } from "react"
import { SubscribeClient } from "./subscribe-client"
import { Loader2 } from "lucide-react"

function SubscribeLoading() {
  return (
    <div
      className="flex min-h-[calc(100vh-104px)] items-center justify-center bg-app-bg"
      role="status"
      aria-label="Carregando"
    >
      <Loader2 className="h-8 w-8 animate-spin text-app-fg" />
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<SubscribeLoading />}>
      <SubscribeClient />
    </Suspense>
  )
}
