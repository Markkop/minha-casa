"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Flag } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  ADMIN_FEATURE_FLAG_META,
  type AdminFeatureFlagMeta,
  type AdminFeatureFlags,
} from "@/lib/admin-feature-flags"
import { useAdminFeatureFlags } from "@/lib/admin-feature-flags-provider"
import { useSession } from "@/lib/auth-client"
import {
  WORKSPACE_STACK_CLASS,
  WorkspacePage,
  WorkspacePanel,
} from "@/app/components/workspace-ui"

type SessionUser = {
  isAdmin?: boolean
}

function FlagGroup({
  title,
  flags,
  values,
  onToggle,
}: {
  title: string
  flags: AdminFeatureFlagMeta[]
  values: AdminFeatureFlags
  onToggle: (key: AdminFeatureFlagMeta["key"], checked: boolean) => void
}) {
  if (flags.length === 0) return null

  return (
    <WorkspacePanel className="p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-app-muted">
        {title}
      </h2>
      <ul className="space-y-4">
        {flags.map((flag) => (
          <li
            key={flag.key}
            className="flex items-start justify-between gap-4 border-b border-app-border/60 pb-4 last:border-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <Label htmlFor={`admin-flag-${flag.key}`} className="text-sm font-medium text-app-fg">
                {flag.label}
              </Label>
              <p className="mt-1 text-sm text-app-muted">{flag.description}</p>
              {flag.navHref && (
                <p className="mt-1 font-mono text-xs text-app-subtle">{flag.navHref}</p>
              )}
            </div>
            <Switch
              id={`admin-flag-${flag.key}`}
              checked={values[flag.key] === true}
              onCheckedChange={(checked) => onToggle(flag.key, checked)}
            />
          </li>
        ))}
      </ul>
    </WorkspacePanel>
  )
}

export function FeatureFlagsClient() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const user = session?.user as SessionUser | undefined
  const isAdmin = user?.isAdmin === true
  const { flags, isReady, setFlag } = useAdminFeatureFlags()

  useEffect(() => {
    if (isPending) return
    if (!session?.user) {
      router.push("/login")
      return
    }
    if (!isAdmin) {
      router.push("/")
    }
  }, [isPending, session?.user, isAdmin, router])

  if (isPending || !isReady || !isAdmin) {
    return (
      <WorkspacePage>
        <p className="text-sm text-app-muted">Carregando...</p>
      </WorkspacePage>
    )
  }

  const navigationFlags = ADMIN_FEATURE_FLAG_META.filter((f) => f.group === "navigation")
  const analysisFlags = ADMIN_FEATURE_FLAG_META.filter((f) => f.group === "analysis")

  return (
    <WorkspacePage contentClassName={WORKSPACE_STACK_CLASS}>
      <div className="max-w-2xl space-y-3">
        <header>
          <h1 className="text-xl font-semibold text-app-fg">Feature flags</h1>
          <p className="mt-1 text-sm text-app-muted">
            Funcionalidades experimentais visíveis apenas para administradores neste
            navegador.
          </p>
        </header>
        <WorkspacePanel className="flex items-start gap-3 p-4">
          <Flag className="mt-0.5 size-5 shrink-0 text-app-muted" aria-hidden />
          <p className="text-sm text-app-muted">
            As alterações são salvas apenas neste navegador (localStorage). Usuários
            que não são administradores não veem estas opções. No futuro, as flags
            poderão ser persistidas no servidor.
          </p>
        </WorkspacePanel>

        <FlagGroup
          title="Navegação"
          flags={navigationFlags}
          values={flags}
          onToggle={setFlag}
        />

        <FlagGroup
          title="Análise"
          flags={analysisFlags}
          values={flags}
          onToggle={setFlag}
        />
      </div>
    </WorkspacePage>
  )
}
