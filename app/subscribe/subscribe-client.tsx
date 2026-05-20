"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import {
  syncSubscriptionCookie,
  isSafeRedirectPath,
  type SubscriptionSyncPlan as Plan,
  type SubscriptionSyncSubscription as Subscription,
} from "@/lib/sync-subscription-cookie"
import {
  PLAN_DISPLAY,
  SUBSCRIBE_TIER_ORDER,
  type DisplayTierSlug,
  type SubscribeTierDisplay,
} from "./plan-display"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Check, Loader2, Crown, Calendar, AlertCircle, CheckCircle, FlaskConical } from "lucide-react"

function formatPrice(priceInCents: number): string {
  if (priceInCents === 0) return "Gratis"
  return `R$ ${(priceInCents / 100).toFixed(2).replace(".", ",")}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function SubscribeTierCard({
  tierSlug,
  display,
  apiPlan,
  isCurrentPlan,
  isLoggedIn,
  onSubscribe,
  isLoading,
}: {
  tierSlug: DisplayTierSlug
  display: SubscribeTierDisplay
  apiPlan?: Plan | null
  isCurrentPlan: boolean
  isLoggedIn: boolean
  onSubscribe: (planId: string) => void
  isLoading: boolean
}) {
  const plusCanCheckout =
    tierSlug === "plus" &&
    Boolean(apiPlan?.stripePriceId) &&
    (apiPlan?.priceInCents ?? 0) > 0

  const pricePresentation = (): { main: string; suffix?: string } => {
    if (tierSlug === "plus") {
      if (apiPlan) {
        const main = formatPrice(apiPlan.priceInCents)
        const suffix =
          apiPlan.priceInCents > 0 ? "/mês" : undefined
        return { main, suffix }
      }
      return {
        main: display.priceFallbackLabel,
        suffix: display.priceSuffix,
      }
    }
    return {
      main: display.priceLabel ?? "",
      suffix: display.priceSuffix,
    }
  }

  const { main: priceMain, suffix: priceSuffix } = pricePresentation()

  const handleClick = () => {
    if (tierSlug === "plus" && !isLoggedIn) {
      window.location.href = `/login?redirect=/subscribe`
      return
    }
    if (plusCanCheckout && apiPlan) {
      onSubscribe(apiPlan.id)
    }
  }

  const getButtonText = (): string => {
    if (tierSlug === "pro") return "Em breve"
    if (tierSlug === "plus") {
      if (isCurrentPlan) return "Plano Atual"
      if (!isLoggedIn) return "Fazer Login"
      if (isLoading) return "Processando..."
      if (!plusCanCheckout) return "Em breve"
      return "Assinar Agora"
    }
    return "Em breve"
  }

  const buttonDisabled =
    tierSlug === "pro" ||
    (tierSlug === "plus" &&
      (isCurrentPlan || isLoading || (Boolean(isLoggedIn) && !plusCanCheckout)))

  const primaryAppearance = tierSlug === "plus" && !buttonDisabled

  const showSpinner = tierSlug === "plus" && isLoading

  return (
    <Card
      data-tier={tierSlug}
      data-testid={`tier-card-${tierSlug}`}
      className={`relative flex flex-col ${
        isCurrentPlan && tierSlug === "plus"
          ? "border-primary border-2 shadow-[0_0_30px_rgba(197,255,1,0.15)]"
          : "border-brightGrey"
      } bg-eerieBlack`}
    >
      {isCurrentPlan && tierSlug === "plus" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Seu Plano
          </span>
        </div>
      )}
      <CardHeader className="text-center pb-4">
        <CardTitle
          data-testid={`tier-card-${tierSlug}-title`}
          className="text-2xl font-bold text-white"
        >
          {display.name}
        </CardTitle>
        <CardDescription className="text-ashGray mt-2">
          {display.description}
        </CardDescription>
        <div className="mt-4" data-testid={`tier-card-${tierSlug}-price`}>
          <span className="text-4xl font-bold text-white">{priceMain}</span>
          {priceSuffix ? (
            <span className="text-ashGray text-sm ml-2">{priceSuffix}</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {display.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-ashGray text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          data-testid={`tier-card-${tierSlug}-button`}
          className={
            primaryAppearance
              ? "w-full bg-primary text-black hover:bg-primary/90"
              : tierSlug === "pro"
                ? "w-full bg-middleGray text-ashGray cursor-not-allowed"
                : "w-full bg-middleGray text-white cursor-default"
          }
          disabled={buttonDisabled}
          onClick={handleClick}
        >
          {showSpinner ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {getButtonText()}
            </>
          ) : (
            getButtonText()
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

function checkIsExpiringSoon(expiresAt: string): boolean {
  const expiresAtTime = new Date(expiresAt).getTime()
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
  return expiresAtTime - Date.now() < sevenDaysInMs
}

function CurrentSubscriptionCard({
  subscription,
  plan,
  isExpiringSoon,
  billingPortalLoading,
  onBillingPortal,
}: {
  subscription: Subscription
  plan: Plan
  isExpiringSoon: boolean
  billingPortalLoading: boolean
  onBillingPortal: () => void
}) {
  const canStripePortal = Boolean(subscription.stripeSubscriptionId)

  return (
    <Card className="bg-eerieBlack border-brightGrey mb-8">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Sua Assinatura
        </CardTitle>
        <CardDescription className="text-ashGray">
          Detalhes do seu plano atual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-ashGray">Plano:</span>
          <span className="text-white font-medium">{plan.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ashGray">Status:</span>
          <span
            className={`font-medium ${
              subscription.status === "active"
                ? "text-green-500"
                : subscription.status === "expired"
                  ? "text-red-500"
                  : "text-yellow-500"
            }`}
          >
            {subscription.status === "active"
              ? "Ativo"
              : subscription.status === "expired"
                ? "Expirado"
                : "Cancelado"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ashGray">Inicio:</span>
          <span className="text-white flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDate(subscription.startsAt)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ashGray">Expira em:</span>
          <span
            className={`flex items-center gap-1 ${isExpiringSoon ? "text-yellow-500" : "text-white"}`}
          >
            {isExpiringSoon && <AlertCircle className="w-4 h-4" />}
            <Calendar className="w-4 h-4" />
            {formatDate(subscription.expiresAt)}
          </span>
        </div>
        {subscription.cancelAtPeriodEnd === true &&
          subscription.status === "active" && (
            <div className="rounded-md bg-amber-900/25 border border-amber-700/80 px-3 py-2 text-amber-200 text-sm">
              Sua renovacao esta desativada. O acesso continua ate a data em
              &quot;Expira em&quot;.
            </div>
          )}
      </CardContent>
      {canStripePortal ? (
        <CardFooter className="flex-col gap-2 pt-0">
          <Button
            variant="outline"
            className="w-full border-brightGrey text-white hover:bg-middleGray"
            disabled={billingPortalLoading}
            onClick={onBillingPortal}
          >
            {billingPortalLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Abrindo portal...
              </>
            ) : (
              "Gerenciar cobranca e cartao no Stripe"
            )}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}

export function SubscribeClient() {
  const router = useRouter()
  const { data: session, isPending: sessionLoading } = useSession()
  const searchParams = useSearchParams()
  const postRedirect = searchParams.get("redirect")
  const didPostRedirect = useRef(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [stripeTestMode, setStripeTestMode] = useState(false)
  const [billingPortalLoading, setBillingPortalLoading] = useState(false)

  // Check for success/cancelled query params
  const isSuccess = searchParams.get("success") === "true"
  const isCancelled = searchParams.get("cancelled") === "true"
  const sessionId = searchParams.get("session_id")

  // Verify payment status after redirect from Stripe
  useEffect(() => {
    if (!isSuccess || !session?.user) return

    let attempts = 0
    const maxAttempts = 10
    const pollInterval = 2000 // 2 seconds

    // Show initial processing message
    setSuccessMessage("Processando seu pagamento...")

    const verifyPayment = async () => {
      try {
        const result = await syncSubscriptionCookie()
        if (result.hasActiveSubscription && result.subscription) {
          setSubscription(result.subscription)
          setCurrentPlan(result.plan ?? null)
          setSuccessMessage("Assinatura confirmada! Sua conta foi ativada.")
          if (
            !didPostRedirect.current &&
            isSafeRedirectPath(postRedirect)
          ) {
            didPostRedirect.current = true
            router.replace(postRedirect)
          }
          return true
        }
        return false
      } catch {
        return false
      }
    }

    const pollForConfirmation = async () => {
      const confirmed = await verifyPayment()
      if (confirmed) return

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(pollForConfirmation, pollInterval)
      } else {
        // After max attempts, show a softer success message
        // The webhook might still be processing
        setSuccessMessage(
          "Pagamento recebido! Sua assinatura será ativada em instantes. " +
          "Se não aparecer em alguns minutos, entre em contato conosco."
        )
      }
    }

    pollForConfirmation()
  }, [isSuccess, session?.user, sessionId, postRedirect, router])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch available plans
        const plansResponse = await fetch("/api/plans")
        if (!plansResponse.ok) {
          throw new Error("Erro ao carregar planos")
        }
        const plansData = await plansResponse.json()
        setPlans(plansData.plans || [])
        setStripeTestMode(plansData.stripeTestMode || false)

        if (session?.user) {
          const syncResult = await syncSubscriptionCookie()
          if (syncResult.subscription) {
            setSubscription(syncResult.subscription)
            setCurrentPlan(syncResult.plan ?? null)
            setIsExpiringSoon(checkIsExpiringSoon(syncResult.subscription.expiresAt))
          } else {
            setSubscription(null)
            setCurrentPlan(null)
          }

          if (
            syncResult.hasActiveSubscription &&
            isSafeRedirectPath(postRedirect) &&
            !didPostRedirect.current
          ) {
            didPostRedirect.current = true
            router.replace(postRedirect)
            return
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      } finally {
        setLoading(false)
      }
    }

    if (!sessionLoading) {
      fetchData()
    }
  }, [session, sessionLoading, postRedirect, router])

  const handleSubscribe = async (planId: string) => {
    try {
      setCheckoutLoading(true)
      setError(null)

      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar sessao de checkout")
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error("URL de checkout nao retornada")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento")
      setCheckoutLoading(false)
    }
  }

  const handleBillingPortal = async () => {
    try {
      setBillingPortalLoading(true)
      setError(null)
      const response = await fetch("/api/billing/portal", { method: "POST" })
      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Erro ao abrir portal de cobranca")
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      throw new Error("Portal nao retornou URL")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir portal de cobranca")
    } finally {
      setBillingPortalLoading(false)
    }
  }

  if (sessionLoading || loading) {
    return (
      <div
        className="min-h-[calc(100vh-56px)] flex items-center justify-center"
        role="status"
        aria-label="Carregando"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const plusPlan = plans.find((p) => p.slug === "plus") ?? null
  const isPlusCurrentPlan = currentPlan?.slug === "plus"

  if (error) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-eerieBlack border-brightGrey">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-ashGray text-center" role="alert">
              {error}
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-brightGrey text-white hover:bg-middleGray"
            >
              Tentar novamente
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-black text-white">
      <main className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-primary">Assinatura</span>
          </h1>
          <p className="text-lg sm:text-xl text-ashGray max-w-3xl mx-auto">
            {session?.user
              ? "Gerencie sua assinatura e escolha o plano ideal para suas necessidades."
              : "Faca login para gerenciar sua assinatura ou veja nossos planos disponiveis."}
          </p>
        </div>

        {/* Stripe Test Mode Banner */}
        {stripeTestMode && (
          <Card className="bg-amber-900/20 border-amber-500 mb-8">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-3">
                <FlaskConical className="w-5 h-5 text-amber-400" />
                <div className="text-center">
                  <p className="text-amber-400 font-semibold">
                    MODO DE TESTE ATIVO
                  </p>
                  <p className="text-amber-300/80 text-sm">
                    Pagamentos nesta pagina estao em modo de teste do Stripe. Nenhuma cobranca real sera processada.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success message */}
        {successMessage && (
          <Card className="bg-green-900/20 border-green-500 mb-8">
            <CardContent className="py-4">
              <p className="text-green-400 text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {successMessage}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Cancelled message */}
        {isCancelled && !successMessage && (
          <Card className="bg-yellow-900/20 border-yellow-500 mb-8">
            <CardContent className="py-4">
              <p className="text-yellow-400 text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Checkout cancelado. Voce pode tentar novamente quando quiser.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Login prompt for unauthenticated users */}
        {!session?.user && (
          <div className="mb-12 text-center">
            <Card className="inline-block bg-eerieBlack border-brightGrey">
              <CardContent className="py-6 px-8">
                <p className="text-ashGray mb-4">
                  Faca login para ver sua assinatura e solicitar planos.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/login?redirect=/subscribe">
                    <Button
                      variant="outline"
                      className="border-brightGrey text-white hover:bg-middleGray"
                    >
                      Entrar
                    </Button>
                  </Link>
                  <Link href="/signup?redirect=/subscribe">
                    <Button className="bg-primary text-black hover:bg-primary/90">
                      Criar conta
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current subscription */}
        {session?.user && subscription && currentPlan && (
          <CurrentSubscriptionCard
            subscription={subscription}
            plan={currentPlan}
            isExpiringSoon={isExpiringSoon}
            billingPortalLoading={billingPortalLoading}
            onBillingPortal={handleBillingPortal}
          />
        )}

        {/* No subscription message */}
        {session?.user && !subscription && !successMessage && (
          <Card className="bg-eerieBlack border-brightGrey mb-8">
            <CardContent className="py-6">
              <p className="text-ashGray text-center">
                Voce ainda nao possui uma assinatura ativa. Escolha um plano
                abaixo para comecar.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Available plans (Plus da API + Pro na vitrine) */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Planos Disponiveis
          </h2>
          {!plusPlan ? (
            <p className="text-center text-amber-400/95 text-sm mb-6 px-4">
              O plano Plus nao foi carregado do servidor neste momento. O plano
              Pro continua visivel como referencia — experimente atualizar ou
              entre em contato.
            </p>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {SUBSCRIBE_TIER_ORDER.map((tierSlug) => (
              <SubscribeTierCard
                key={tierSlug}
                tierSlug={tierSlug}
                display={PLAN_DISPLAY[tierSlug]}
                apiPlan={tierSlug === "plus" ? plusPlan : undefined}
                isCurrentPlan={tierSlug === "plus" ? isPlusCurrentPlan : false}
                isLoggedIn={!!session?.user}
                onSubscribe={handleSubscribe}
                isLoading={checkoutLoading}
              />
            ))}
          </div>
        </div>

        {/* Contact section */}
        <div className="text-center mt-12">
          <p className="text-ashGray text-sm">
            Duvidas sobre os planos? Entre em contato conosco.
          </p>
        </div>
      </main>
    </div>
  )
}
