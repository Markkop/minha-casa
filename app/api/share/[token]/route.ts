import { NextRequest, NextResponse } from "next/server"
import { getShare } from "@/app/anuncios/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: "Token é obrigatório" },
        { status: 400 }
      )
    }

    // Get share from database
    const share = await getShare(token)

    if (!share) {
      return NextResponse.json(
        { error: "Link de compartilhamento não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      collection: share.collection_data.collection,
      listings: share.collection_data.listings,
      metadata: {
        collectionName: share.collection_name,
        createdAt: share.created_at,
        accessedCount: share.accessed_count,
      },
    })
  } catch (error) {
    console.error("Error fetching share:", error)
    return NextResponse.json(
      { error: "Erro ao carregar compartilhamento" },
      { status: 500 }
    )
  }
}
