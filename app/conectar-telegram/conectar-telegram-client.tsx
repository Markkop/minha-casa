"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import {
  clearPendingTgLinkCode,
  resolveTgLinkCode,
  savePendingTgLinkCode,
} from "@/lib/telegram-link-pending"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type LinkState = "idle" | "linking" | "success" | "error"

export function ConectarTelegramClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [linkState, setLinkState] = useState<LinkState>("idle")
  const [error, setError] = useState("")
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const urlCode = searchParams.get("tg")
  const code = resolveTgLinkCode(urlCode)

  const redirectPath = code
    ? `/conectar-telegram?tg=${encodeURIComponent(code)}`
    : "/conectar-telegram"

  useEffect(() => {
    if (code) {
      savePendingTgLinkCode(code)
    }
  }, [code])

  useEffect(() => {
    let cancelled = false

    authClient.getSession().then((result) => {
      if (cancelled) return
      setIsAuthenticated(!!result.data?.user)
      setSessionChecked(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const connect = useCallback(async (linkCode: string) => {
    setLinkState("linking")
    setError("")

    try {
      const response = await fetch("/api/integrations/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: linkCode }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setLinkState("error")
        setError(
          typeof payload.error === "string"
            ? payload.error
            : "Não foi possível conectar o Telegram. Tente gerar um novo código no chat."
        )
        return
      }

      clearPendingTgLinkCode()
      setLinkState("success")
    } catch {
      setLinkState("error")
      setError("Erro de rede. Tente novamente.")
    }
  }, [])

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated || !code || linkState === "success") return
    if (linkState === "linking") return
    void connect(code)
  }, [sessionChecked, isAuthenticated, code, connect, linkState])

  if (!code) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Conectar Telegram</CardTitle>
            <CardDescription>
              Envie qualquer mensagem para o bot no Telegram para receber um link com código de
              conexão.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!sessionChecked) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <p className="text-app-muted">Verificando sessão…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Conectar Telegram</CardTitle>
            <CardDescription>
              Entre ou crie sua conta para vincular o Telegram ao Minha Casa. Seu código{" "}
              <span className="font-mono font-medium">{code}</span> será usado após o login.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`}>Entrar</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}>
                Criar conta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (linkState === "success") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Telegram conectado</CardTitle>
            <CardDescription>
              Sua conta foi vinculada. Volte ao Telegram e envie anúncios, links ou arquivos para
              análise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/anuncios")}>
              Ir para anúncios
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Conectar Telegram</CardTitle>
          <CardDescription>
            {linkState === "linking"
              ? "Vinculando sua conta…"
              : "Confirme a conexão do seu Telegram com o Minha Casa."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-app-muted">
            Código: <span className="font-mono font-medium text-foreground">{code}</span>
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={linkState === "linking"} onClick={() => void connect(code)}>
            {linkState === "linking" ? "Conectando…" : "Conectar agora"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
