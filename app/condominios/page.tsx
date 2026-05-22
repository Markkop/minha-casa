import type { Metadata } from "next"
import { CondominiumsClient } from "./condominiums-client"

export const metadata: Metadata = {
  title: "Condomínios | Minha Casa",
}

export default function CondominiosPage() {
  return <CondominiumsClient />
}
