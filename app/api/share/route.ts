import { NextRequest, NextResponse } from "next/server"
import { createShare, validateMasterPassword, type CollectionExportData } from "@/app/anuncios/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, collectionData } = body as {
      password: string
      collectionData: CollectionExportData
    }

    // Validate required fields
    if (!password) {
      return NextResponse.json(
        { error: "Senha é obrigatória" },
        { status: 400 }
      )
    }

    if (!collectionData || !collectionData.collection || !collectionData.listings) {
      return NextResponse.json(
        { error: "Dados da coleção são obrigatórios" },
        { status: 400 }
      )
    }

    // Validate master password
    if (!validateMasterPassword(password)) {
      return NextResponse.json(
        { error: "Senha incorreta" },
        { status: 401 }
      )
    }

    // Create share in database
    const collectionName = collectionData.collection.label || "Coleção sem nome"
    const result = await createShare(collectionName, collectionData)

    // Build share URL
    const baseUrl = request.nextUrl.origin
    const shareUrl = `${baseUrl}/anuncios?dbshare=${result.token}`

    return NextResponse.json({
      success: true,
      token: result.token,
      shareUrl,
    })
  } catch (error) {
    console.error("Error creating share:", error)
    return NextResponse.json(
      { error: "Erro ao criar link de compartilhamento" },
      { status: 500 }
    )
  }
}
