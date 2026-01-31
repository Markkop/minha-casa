"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { useAddons, useAddonsLoading } from "@/lib/use-addons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ============================================================================
// Types
// ============================================================================

export interface AddonGuardProps {
  /** The addon slug to check for access */
  addonSlug: string
  /** The display name of the addon for the access denied message */
  addonName: string
  /** Content to render when user has access */
  children: ReactNode
  /** Custom loading component (optional) */
  loadingComponent?: ReactNode
  /** Custom fallback component when access is denied (optional) */
  fallbackComponent?: ReactNode
  /** Whether to show the full access denied UI (default: true) */
  showAccessDeniedUI?: boolean
}

// ============================================================================
// Default Loading Component
// ============================================================================

function DefaultLoadingComponent() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-ashGray">Verificando acesso...</p>
    </div>
  )
}

// ============================================================================
// Default Access Denied Component
// ============================================================================

interface AccessDeniedProps {
  addonName: string
  orgContext: {
    type: "personal" | "organization"
    organizationId?: string
    organizationName?: string
  }
}

function DefaultAccessDeniedComponent({ addonName, orgContext }: AccessDeniedProps) {
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

// ============================================================================
// AddonGuard Component
// ============================================================================

/**
 * AddonGuard
 *
 * A reusable component that guards content behind addon access.
 * Checks if the current user OR their current organization has access
 * to the specified addon (dual-check logic).
 *
 * @example
 * ```tsx
 * // Basic usage with default UI
 * <AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
 *   <ProtectedContent />
 * </AddonGuard>
 *
 * // With custom loading component
 * <AddonGuard
 *   addonSlug="flood"
 *   addonName="Risco de Enchente"
 *   loadingComponent={<CustomSpinner />}
 * >
 *   <FloodRiskViewer />
 * </AddonGuard>
 *
 * // With custom fallback (access denied) component
 * <AddonGuard
 *   addonSlug="analytics"
 *   addonName="Analytics"
 *   fallbackComponent={<UpgradePrompt feature="Analytics" />}
 * >
 *   <AnalyticsDashboard />
 * </AddonGuard>
 *
 * // Hide completely when no access (no fallback UI)
 * <AddonGuard
 *   addonSlug="premium"
 *   addonName="Premium Features"
 *   showAccessDeniedUI={false}
 * >
 *   <PremiumFeature />
 * </AddonGuard>
 * ```
 */
export function AddonGuard({
  addonSlug,
  addonName,
  children,
  loadingComponent,
  fallbackComponent,
  showAccessDeniedUI = true,
}: AddonGuardProps) {
  const { hasAddon, orgContext } = useAddons()
  const isLoading = useAddonsLoading()

  // Show loading state while checking addon access
  if (isLoading) {
    return <>{loadingComponent ?? <DefaultLoadingComponent />}</>
  }

  // Check if user or org has access to the addon
  const hasAccess = hasAddon(addonSlug)

  if (!hasAccess) {
    // If showAccessDeniedUI is false, render nothing
    if (!showAccessDeniedUI) {
      return null
    }

    // Use custom fallback if provided, otherwise use default
    if (fallbackComponent) {
      return <>{fallbackComponent}</>
    }

    return <DefaultAccessDeniedComponent addonName={addonName} orgContext={orgContext} />
  }

  // User has access, render the protected content
  return <>{children}</>
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * AddonContent
 *
 * A convenience component that only renders children if the user has addon access.
 * Unlike AddonGuard, this component renders nothing when access is denied (no fallback UI).
 *
 * Useful for conditionally showing features within a page without blocking the entire page.
 *
 * @example
 * ```tsx
 * <div>
 *   <h1>Dashboard</h1>
 *   <AddonContent addonSlug="analytics">
 *     <AnalyticsWidget />
 *   </AddonContent>
 * </div>
 * ```
 */
export function AddonContent({
  addonSlug,
  children,
}: {
  addonSlug: string
  children: ReactNode
}) {
  return (
    <AddonGuard
      addonSlug={addonSlug}
      addonName=""
      showAccessDeniedUI={false}
    >
      {children}
    </AddonGuard>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { DefaultLoadingComponent, DefaultAccessDeniedComponent }
