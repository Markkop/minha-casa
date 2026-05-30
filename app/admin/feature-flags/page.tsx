import type { Metadata } from "next"
import { FeatureFlagsClient } from "./feature-flags-client"

export const metadata: Metadata = {
  title: "Feature flags | Minha Casa",
  description: "Ativar funcionalidades experimentais para administradores.",
}

export default function AdminFeatureFlagsPage() {
  return <FeatureFlagsClient />
}
