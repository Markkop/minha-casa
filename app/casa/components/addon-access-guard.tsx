"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { useAddons, useAddonsLoading } from "@/lib/use-addons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-ashGray">Verificando acesso...</p>
      </div>
    )
  }

  // Check if user or org has access to the addon
  const hasAccess = hasAddon(addonSlug)

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="bg-raisinBlack border-brightGrey">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <CardTitle className="text-2xl text-white">
                Acesso Restrito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-ashGray">
                O acesso ao <span className="text-primary font-semibold">{addonName}</span> requer
                uma licença ativa. Você pode obter acesso de duas formas:
              </p>

              <div className="grid gap-4">
                <div className="p-4 bg-eerieBlack rounded-lg border border-brightGrey">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span>👤</span>
                    Licença Pessoal
                  </h3>
                  <p className="text-sm text-ashGray">
                    Solicite o addon para sua conta pessoal. Você terá acesso
                    independente de qual organização estiver usando.
                  </p>
                </div>

                {orgContext.type === "organization" && (
                  <div className="p-4 bg-eerieBlack rounded-lg border border-brightGrey">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <span>👥</span>
                      Licença da Organização
                    </h3>
                    <p className="text-sm text-ashGray">
                      Sua organização <span className="text-primary">{orgContext.organizationName}</span> não
                      possui este addon. Solicite ao administrador da organização
                      para ativar este recurso.
                    </p>
                  </div>
                )}

                {orgContext.type === "personal" && (
                  <div className="p-4 bg-eerieBlack rounded-lg border border-brightGrey">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <span>👥</span>
                      Licença via Organização
                    </h3>
                    <p className="text-sm text-ashGray">
                      Se você faz parte de uma organização que possui este addon,
                      troque para o contexto da organização para ter acesso.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button asChild variant="outline" className="border-brightGrey hover:bg-eerieBlack">
                  <Link href="/">
                    <span className="mr-2">🏠</span>
                    Voltar ao Início
                  </Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link href="/subscribe">
                    <span className="mr-2">💳</span>
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
