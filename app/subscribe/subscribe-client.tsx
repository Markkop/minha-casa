"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
import { Check, Loader2, Crown, Calendar, AlertCircle } from "lucide-react"

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
}: {
  plan: Plan
  isCurrentPlan: boolean
}) {
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
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? "Plano Atual" : "Solicitar Plano"}
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
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        {session?.user && !subscription && (
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
                />
              ))}
            </div>
          )}
        </div>

        {/* Contact section */}
        <div className="text-center mt-12">
          <p className="text-ashGray text-sm">
            Para solicitar um plano ou tirar duvidas, entre em contato conosco.
          </p>
          <p className="text-ashGray text-sm mt-2">
            As assinaturas sao gerenciadas pela nossa equipe e ativadas
            manualmente.
          </p>
        </div>
      </main>
    </div>
  )
}
