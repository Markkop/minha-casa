import type { Metadata } from "next"
import { AdminClient } from "./components/admin-client"

export const metadata: Metadata = {
  title: "Admin Dashboard | Minha Casa",
  description: "Painel administrativo para gerenciamento do sistema.",
}

export default function AdminPage() {
  return <AdminClient />
}
