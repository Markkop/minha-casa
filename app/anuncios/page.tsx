import type { Metadata } from "next"
import { AnunciosClient } from "./components/anuncios-client"

export const metadata: Metadata = {
  title: "Anúncios de Imóveis | Parser IA",
  description:
    "Gerencie anúncios de imóveis com extração automática de dados usando IA.",
}

export default function AnunciosPage() {
  return <AnunciosClient />
}

