import type { Metadata } from "next"
import { LinksClient } from "./links-client"

export const metadata: Metadata = {
  title: "Links | Minha Casa",
}

export default function LinksPage() {
  return <LinksClient />
}
