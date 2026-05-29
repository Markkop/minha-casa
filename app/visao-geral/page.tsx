import type { Metadata } from "next"
import { OverviewClient } from "./overview-client"

export const metadata: Metadata = {
  title: "Visão geral | Minha Casa",
}

export default function VisaoGeralPage() {
  return <OverviewClient />
}
