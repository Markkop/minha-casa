import type { Metadata } from "next"
import { RegionsClient } from "./regions-client"

export const metadata: Metadata = {
  title: "Regiões | Minha Casa",
}

export default function RegioesPage() {
  return <RegionsClient />
}
