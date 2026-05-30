"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Contact,
  Home,
  LayoutDashboard,
  Link2,
  LogOut,
  MapPinned,
  ScanSearch,
  Settings,
  User,
  Users,
  Waves,
} from "lucide-react"

import { ImportExportMenuItems } from "@/app/anuncios/components/data-management"
import type { LucideIcon } from "lucide-react"

import { GlobalCollectionBreadcrumb } from "@/app/anuncios/components/global-collection-toolbar"
import { AnaliseListingBreadcrumb } from "@/app/analise/components/listing-selector"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  OrganizationBreadcrumbDropdown,
  OrganizationSwitcher,
  useOrganizations,
} from "@/components/organization-switcher"
import { getFlag } from "@/lib/feature-flags"
import { isActivePath } from "@/lib/navigation"
import { signOut, useSession } from "@/lib/auth-client"
import { useAddons } from "@/lib/use-addons"
import { useSubscriptionAccess } from "@/lib/subscription-context"
import { cn } from "@/lib/utils"
import {
  WORKSPACE_NAV_HEIGHT,
  workspaceChromeRowClass,
  workspaceTopBarControlClass,
} from "@/lib/workspace-chrome"

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

const workspaceLinks: NavLink[] = [
  { href: "/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { href: "/anuncios", label: "Anúncios", icon: Home },
  { href: "/comparacao", label: "Comparação", icon: BarChart3 },
  { href: "/analise", label: "Análise", icon: ScanSearch },
  { href: "/financiamento", label: "Financiamento", icon: CircleDollarSign },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/contatos", label: "Contatos", icon: Contact },
  { href: "/regioes", label: "Regiões", icon: MapPinned },
  { href: "/condominios", label: "Condomínios", icon: Building2 },
]

type SessionUser = {
  name?: string | null
  email?: string | null
  image?: string | null
  isAdmin?: boolean
}

function getUserInitials(user?: SessionUser | null) {
  const source = user?.name || user?.email || "U"
  const parts = source
    .split(/[ @._-]+/)
    .filter(Boolean)
    .slice(0, 2)

  return (parts.length > 0 ? parts : [source])
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

const workspaceHeaderControlClass =
  "inline-flex h-10 min-w-0 items-center gap-2 text-sm leading-none"

function BrandLink({
  href,
  className,
  logoClassName,
}: {
  href: string
  className?: string
  logoClassName?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        workspaceHeaderControlClass,
        "rounded-md px-0 font-semibold text-app-fg hover:text-app-fg",
        className
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-action text-app-action-foreground",
          logoClassName
        )}
      >
        <Home className="h-4 w-4" />
      </span>
      <span className="truncate">Minha Casa</span>
    </Link>
  )
}

function WorkspaceNavLinks({ pathname }: { pathname: string }) {
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenu>
      {workspaceLinks.map((link) => {
        const Icon = link.icon
        const isActive = isActivePath(pathname, link.href)

        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={link.href} onClick={() => setOpenMobile(false)}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

function AccountDropdown({
  user,
  isAdmin,
  hasFloodRisk,
  showImportExport,
  onLogout,
  triggerClassName,
  align = "end",
}: {
  user?: SessionUser | null
  isAdmin: boolean
  hasFloodRisk: boolean
  showImportExport?: boolean
  onLogout: () => Promise<void>
  triggerClassName?: string
  align?: "start" | "center" | "end"
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent",
            triggerClassName
          )}
          aria-label="Menu do usuario"
        >
          <Avatar className="h-8 w-8 border border-app-border">
            <AvatarImage src={user?.image || undefined} alt="" />
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {user?.name || user?.email || "Usuário"}
            </span>
            {user?.email && (
              <span className="block truncate text-xs text-app-muted">
                {user.email}
              </span>
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-app-fg">
              {user?.name || "Usuário"}
            </div>
            <div className="truncate text-xs font-normal text-app-muted">
              {user?.email}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasFloodRisk && (
          <DropdownMenuItem asChild>
            <Link href="/floodrisk">
              <Waves className="h-4 w-4" />
              <span>Risco enchente</span>
            </Link>
          </DropdownMenuItem>
        )}
        {getFlag("organizations") && (
          <DropdownMenuItem asChild>
            <Link href="/organizacoes">
              <Users className="h-4 w-4" />
              <span>Organizações</span>
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/subscribe">
            <ClipboardList className="h-4 w-4" />
            <span>Assinatura</span>
          </Link>
        </DropdownMenuItem>
        {showImportExport && <ImportExportMenuItems />}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            void onLogout()
          }}
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WorkspaceSidebar({
  pathname,
  logoHref,
  user,
  isAdmin,
  hasFloodRisk,
  onLogout,
}: {
  pathname: string
  logoHref: string
  user?: SessionUser | null
  isAdmin: boolean
  hasFloodRisk: boolean
  onLogout: () => Promise<void>
}) {
  return (
    <Sidebar>
      <SidebarHeader className={workspaceChromeRowClass}>
        <BrandLink
          href={logoHref}
          className="h-8 gap-2 leading-none"
          logoClassName="size-8 [&_svg]:size-4"
        />
      </SidebarHeader>
      <SidebarContent>
        <WorkspaceNavLinks pathname={pathname} />
      </SidebarContent>
      <SidebarFooter>
        <AccountDropdown
          user={user}
          isAdmin={isAdmin}
          hasFloodRisk={hasFloodRisk}
          showImportExport
          onLogout={onLogout}
          align="start"
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function WorkspaceTopBar({ pathname }: { pathname: string }) {
  const { loading: orgsLoading, hasTeamOrganizations } = useOrganizations()
  const showAnaliseListingBreadcrumb = isActivePath(pathname, "/analise")
  const showOrgBreadcrumb = !orgsLoading && hasTeamOrganizations

  return (
    <header
      id="page-header"
      className="sticky top-0 z-30 w-full"
    >
      <div className={cn(workspaceChromeRowClass, "min-w-0 gap-3")}>
        <SidebarTrigger
          aria-label="Alternar navegação"
          className="size-8 shrink-0 text-app-muted hover:text-app-fg [&_svg]:size-4"
        />
        <Breadcrumb className="flex min-h-0 min-w-0 flex-1 items-center">
          <BreadcrumbList className="flex-nowrap items-center gap-3">
            {showOrgBreadcrumb && (
              <>
                <BreadcrumbItem className="min-w-0">
                  <OrganizationBreadcrumbDropdown
                    className={cn(
                      workspaceTopBarControlClass,
                      showAnaliseListingBreadcrumb
                        ? "max-w-[28vw] md:max-w-[220px]"
                        : "max-w-[38vw] md:max-w-[260px]"
                    )}
                  />
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-app-subtle">
                  <span className="text-sm leading-none">/</span>
                </BreadcrumbSeparator>
              </>
            )}
            <BreadcrumbItem className="min-w-0">
              <GlobalCollectionBreadcrumb
                className={cn(
                  workspaceTopBarControlClass,
                  showAnaliseListingBreadcrumb
                    ? "max-w-[30vw] md:max-w-[300px]"
                    : showOrgBreadcrumb
                      ? "max-w-[44vw] md:max-w-[340px]"
                      : "max-w-[44vw] md:max-w-[380px]"
                )}
              />
            </BreadcrumbItem>
            {showAnaliseListingBreadcrumb && (
              <>
                <BreadcrumbSeparator className="text-app-subtle">
                  <span className="text-sm leading-none">/</span>
                </BreadcrumbSeparator>
                <BreadcrumbItem className="min-w-0">
                  <AnaliseListingBreadcrumb
                    className={cn(
                      workspaceTopBarControlClass,
                      "max-w-[34vw] md:max-w-[360px]"
                    )}
                  />
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

function SessionPendingTopChrome({ children }: { children?: ReactNode }) {
  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{ "--nav-height": WORKSPACE_NAV_HEIGHT } as React.CSSProperties}
      >
        <div
          className={cn(
            workspaceChromeRowClass,
            "mx-auto max-w-[1500px] gap-3"
          )}
        >
          <BrandLink
            href="/"
            className="h-8 gap-2 leading-none"
            logoClassName="size-8 [&_svg]:size-4"
          />
        </div>
      </header>
      {children}
    </>
  )
}

function SimpleTopNav({
  children,
  logoHref,
  isLoggedIn,
  user,
  isAdmin,
  hasFloodRisk,
  onLogout,
}: {
  children?: ReactNode
  logoHref: string
  isLoggedIn: boolean
  user?: SessionUser | null
  isAdmin: boolean
  hasFloodRisk: boolean
  onLogout: () => Promise<void>
}) {
  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{ "--nav-height": WORKSPACE_NAV_HEIGHT } as React.CSSProperties}
      >
        <div
          className={cn(
            workspaceChromeRowClass,
            "mx-auto max-w-[1500px] gap-3"
          )}
        >
          <BrandLink
            href={logoHref}
            className="h-8 gap-2 leading-none"
            logoClassName="size-8 [&_svg]:size-4"
          />
          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-3">
            {isLoggedIn && (
              <div className="hidden sm:block">
                <OrganizationSwitcher />
              </div>
            )}
            {isLoggedIn ? (
              <AccountDropdown
                user={user}
                isAdmin={isAdmin}
                hasFloodRisk={hasFloodRisk}
                onLogout={onLogout}
                triggerClassName="h-8 min-h-0 w-auto max-w-[min(100%,14rem)] gap-2 border border-app-border bg-app-surface px-2 py-0"
              />
            ) : (
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-md bg-app-action px-3 text-sm font-medium text-app-action-foreground transition-colors hover:bg-app-action-hover"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>
      {children}
    </>
  )
}

export function NavBar({ children }: { children?: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, isPending: sessionPending } = useSession()
  const { hasAddon } = useAddons()
  const { hasActiveSubscription, subscriptionReady } = useSubscriptionAccess()
  const user = session?.user as SessionUser | undefined
  const isAdmin = user?.isAdmin === true
  const isLoggedIn = !!session?.user
  const hasFloodRisk = hasAddon("flood")
  const showWorkspaceNav =
    isLoggedIn && subscriptionReady && hasActiveSubscription
  const showPendingWorkspaceNav = isLoggedIn && !subscriptionReady

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  const logoHref = !isLoggedIn
    ? "/"
    : showWorkspaceNav || showPendingWorkspaceNav
      ? "/visao-geral"
      : "/subscribe"

  if (sessionPending) {
    return <SessionPendingTopChrome>{children}</SessionPendingTopChrome>
  }

  if (!showWorkspaceNav && !showPendingWorkspaceNav) {
    return (
      <SimpleTopNav
        logoHref={logoHref}
        isLoggedIn={isLoggedIn}
        user={user}
        isAdmin={isAdmin}
        hasFloodRisk={hasFloodRisk}
        onLogout={handleLogout}
      >
        {children}
      </SimpleTopNav>
    )
  }

  return (
    <SidebarProvider
      style={{ "--nav-height": WORKSPACE_NAV_HEIGHT } as React.CSSProperties}
    >
      <WorkspaceSidebar
        pathname={pathname}
        logoHref={logoHref}
        user={user}
        isAdmin={isAdmin}
        hasFloodRisk={hasFloodRisk}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <WorkspaceTopBar pathname={pathname} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
