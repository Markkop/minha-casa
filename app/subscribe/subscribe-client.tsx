"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
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

interface PlanLimits {
  collectionsLimit: number | null
  listingsPerCollection: number | null
  aiParsesPerMonth: number | null
  canShare: boolean
  canCreateOrg: boolean
}

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  priceInCents: number
  isActive: boolean
  stripePriceId: string | null
  limits: PlanLimits
  createdAt: string
  updatedAt: string
}

interface Subscription {
  id: string
  userId: string
  planId: string
  status: "active" | "expired" | "cancelled"
  startsAt: string
  expiresAt: string
  grantedBy: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

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

function getLimitDisplay(value: number | null): string {
  return value === null ? "Ilimitado" : value.toString()
}

function PlanCard({
  plan,
  isCurrentPlan,
  isLoggedIn,
  onSubscribe,
  isLoading,
}: {
  plan: Plan
  isCurrentPlan: boolean
  isLoggedIn: boolean
  onSubscribe: (planId: string) => void
  isLoading: boolean
}) {
  const canCheckout = plan.stripePriceId && plan.priceInCents > 0
  const isFree = plan.priceInCents === 0

  const handleClick = () => {
    if (!isLoggedIn) {
      window.location.href = `/login?redirect=/subscribe`
      return
    }
    if (canCheckout) {
      onSubscribe(plan.id)
    }
  }

  const getButtonText = () => {
    if (isCurrentPlan) return "Plano Atual"
    if (isLoading) return "Processando..."
    if (!isLoggedIn) return "Fazer Login"
    if (isFree) return "Contatar Equipe"
    if (!canCheckout) return "Em breve"
    return "Assinar Agora"
  }

  const isDisabled = isCurrentPlan || isLoading || (isLoggedIn && !canCheckout && !isFree)

  return (
    <Card
      className={`relative flex flex-col ${
        isCurrentPlan
          ? "border-primary border-2 shadow-[0_0_30px_rgba(197,255,1,0.15)]"
          : "border-brightGrey"
      } bg-eerieBlack`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Seu Plano
          </span>
        </div>
      )}
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-white">
          {plan.name}
        </CardTitle>
        {plan.description && (
          <CardDescription className="text-ashGray mt-2">
            {plan.description}
          </CardDescription>
        )}
        <div className="mt-4">
          <span className="text-4xl font-bold text-white">
            {formatPrice(plan.priceInCents)}
          </span>
          {plan.priceInCents > 0 && (
            <span className="text-ashGray text-sm ml-2">/mes</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          <li className="flex items-start gap-2">
            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span className="text-ashGray text-sm">
              {getLimitDisplay(plan.limits.collectionsLimit)} colecoes
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span className="text-ashGray text-sm">
              {getLimitDisplay(plan.limits.listingsPerCollection)} anuncios por
              colecao
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span className="text-ashGray text-sm">
              {getLimitDisplay(plan.limits.aiParsesPerMonth)} parses de IA por
              mes
            </span>
          </li>
          {plan.limits.canShare && (
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-ashGray text-sm">
                Compartilhamento de colecoes
              </span>
            </li>
          )}
          {plan.limits.canCreateOrg && (
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-ashGray text-sm">Criar organizacoes</span>
            </li>
          )}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className={`w-full ${
            isCurrentPlan
              ? "bg-middleGray text-white cursor-default"
              : "bg-primary text-black hover:bg-primary/90"
          }`}
          disabled={isDisabled}
          onClick={handleClick}
        >
          {isLoading ? (
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
}: {
  subscription: Subscription
  plan: Plan
  isExpiringSoon: boolean
}) {
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
        {subscription.notes && (
          <div className="pt-4 border-t border-brightGrey">
            <span className="text-ashGray text-sm">Notas: </span>
            <span className="text-white text-sm">{subscription.notes}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SubscribeClient() {
  const { data: session, isPending: sessionLoading } = useSession()
  const searchParams = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [stripeTestMode, setStripeTestMode] = useState(false)

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
        const subscriptionResponse = await fetch("/api/subscriptions")
        if (subscriptionResponse.ok) {
          const data = await subscriptionResponse.json()
          if (data.subscription?.status === "active") {
            setSubscription(data.subscription)
            setCurrentPlan(data.plan)
            setSuccessMessage("Assinatura confirmada! Sua conta foi ativada.")
            return true // Payment confirmed
          }
        }
        return false // Not yet confirmed
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
  }, [isSuccess, session?.user, sessionId])

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

        // Fetch current subscription if user is logged in
        if (session?.user) {
          const subscriptionResponse = await fetch("/api/subscriptions")
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json()
            setSubscription(subscriptionData.subscription)
            setCurrentPlan(subscriptionData.plan)
            if (subscriptionData.subscription) {
              setIsExpiringSoon(
                checkIsExpiringSoon(subscriptionData.subscription.expiresAt)
              )
            }
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
  }, [session, sessionLoading])

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

        {/* Available plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Planos Disponiveis
          </h2>
          {plans.length === 0 ? (
            <Card className="bg-eerieBlack border-brightGrey">
              <CardContent className="py-6">
                <p className="text-ashGray text-center">
                  Nenhum plano disponivel no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={currentPlan?.id === plan.id}
                  isLoggedIn={!!session?.user}
                  onSubscribe={handleSubscribe}
                  isLoading={checkoutLoading}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contact section */}
        <div className="text-center mt-12">
          <p className="text-ashGray text-sm">
            Duvidas sobre os planos? Entre em contato conosco.
          </p>
          <p className="text-ashGray text-sm mt-2">
            Planos gratuitos e promocionais sao ativados pela nossa equipe.
          </p>
        </div>
      </main>
    </div>
  )
}
