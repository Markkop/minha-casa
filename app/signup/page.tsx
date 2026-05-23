import { Suspense } from "react"
import { SignupClient } from "./signup-client"

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
          <p className="text-app-muted">Carregando…</p>
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  )
}
