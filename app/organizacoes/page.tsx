import type { Metadata } from "next"
import { OrganizacoesClient } from "./components/organizacoes-client"

export const metadata: Metadata = {
  title: "Organizacoes | Minha Casa",
  description: "Gerencie suas organizacoes e membros.",
}

export default function OrganizacoesPage() {
  return <OrganizacoesClient />
}
