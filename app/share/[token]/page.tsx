import type { Metadata } from "next"
import { ShareClient } from "./share-client"

interface PageProps {
  params: Promise<{ token: string }>
}

/**
 * Fetch shared collection data for metadata
 */
async function getSharedCollection(token: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

    const response = await fetch(`${baseUrl}/api/shared/${token}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const data = await getSharedCollection(token)

  if (!data?.collection) {
    return {
      title: "Coleção não encontrada | Minha Casa",
      description: "A coleção compartilhada não foi encontrada ou não está mais disponível.",
    }
  }

  const collectionName = data.collection.name
  const listingsCount = data.metadata?.totalListings || 0

  return {
    title: `${collectionName} | Minha Casa`,
    description: `Coleção compartilhada com ${listingsCount} ${listingsCount === 1 ? "imóvel" : "imóveis"}. Visualize os anúncios de imóveis desta coleção.`,
    openGraph: {
      title: `${collectionName} | Minha Casa`,
      description: `Coleção compartilhada com ${listingsCount} ${listingsCount === 1 ? "imóvel" : "imóveis"}.`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${collectionName} | Minha Casa`,
      description: `Coleção compartilhada com ${listingsCount} ${listingsCount === 1 ? "imóvel" : "imóveis"}.`,
    },
  }
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  return <ShareClient token={token} />
}
