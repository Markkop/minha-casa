import type { Metadata } from "next"
import { ContactsClient } from "./contacts-client"

export const metadata: Metadata = {
  title: "Contatos | Minha Casa",
}

export default function ContatosPage() {
  return <ContactsClient />
}
