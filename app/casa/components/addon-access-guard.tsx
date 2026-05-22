"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { useAddons, useAddonsLoading } from "@/lib/use-addons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Home, Lock, User, Users } from "lucide-react"

interface AddonAccessGuardProps {
  /** The addon slug to check for access */
  addonSlug: string
  /** The display name of the addon for the access denied message */
  addonName: string
  /** Content to render when user has access */
  children: ReactNode
}

/**
 * AddonAccessGuard
 *
 * Guards content behind addon access. Checks if the current user OR their
 * current organization has access to the specified addon.
 *
 * If loading, shows a loading state.
 * If no access, shows an access denied message with options to get access.
 * If access is granted, renders the children.
 */
export function AddonAccessGuard({
  addonSlug,
  addonName,
  children,
}: AddonAccessGuardProps) {
  const { hasAddon, orgContext } = useAddons()
  const isLoading = useAddonsLoading()

  // Show loading state while checking addon access
  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg text-app-fg flex items-center justify-center">
        <p className="text-app-muted">Verificando acesso...</p>
      </div>
    )
  }

  // Check if user or org has access to the addon
  const hasAccess = hasAddon(addonSlug)

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-app-bg text-app-fg">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="bg-app-surface border-app-border">
            <CardHeader className="text-center">
              <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-2xl text-app-fg">
                Acesso Restrito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-app-muted">
                O acesso ao <span className="text-app-accent font-semibold">{addonName}</span> requer
                uma licença ativa. Você pode obter acesso de duas formas:
              </p>

              <div className="grid gap-4">
                <div className="p-4 bg-app-surface-muted rounded-lg border border-app-border">
                  <h3 className="font-semibold text-app-fg mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Licença Pessoal
                  </h3>
                  <p className="text-sm text-app-muted">
                    Solicite o addon para sua conta pessoal. Você terá acesso
                    independente de qual organização estiver usando.
                  </p>
                </div>

                {orgContext.type === "organization" && (
                  <div className="p-4 bg-app-surface-muted rounded-lg border border-app-border">
                    <h3 className="font-semibold text-app-fg mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Licença da Organização
                    </h3>
                    <p className="text-sm text-app-muted">
                      Sua organização <span className="text-app-accent">{orgContext.organizationName}</span> não
                      possui este addon. Solicite ao administrador da organização
                      para ativar este recurso.
                    </p>
                  </div>
                )}

                {orgContext.type === "personal" && (
                  <div className="p-4 bg-app-surface-muted rounded-lg border border-app-border">
                    <h3 className="font-semibold text-app-fg mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Licença via Organização
                    </h3>
                    <p className="text-sm text-app-muted">
                      Se você faz parte de uma organização que possui este addon,
                      troque para o contexto da organização para ter acesso.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button asChild variant="outline" className="border-app-border hover:bg-app-surface-muted">
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Voltar ao Início
                  </Link>
                </Button>
                <Button asChild className="bg-app-action hover:bg-app-action-hover">
                  <Link href="/subscribe">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Ver Planos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // User has access, render the protected content
  return <>{children}</>
}
