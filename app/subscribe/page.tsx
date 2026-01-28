import { Suspense } from "react"
import { SubscribeClient } from "./subscribe-client"
import { Loader2 } from "lucide-react"

function SubscribeLoading() {
  return (
    <div
      className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-black"
      role="status"
      aria-label="Carregando"
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
