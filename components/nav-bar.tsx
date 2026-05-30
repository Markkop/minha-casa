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
import { Button } from "@/components/ui/button"
import {
  OrganizationBreadcrumbDropdown,
  OrganizationSwitcher,
} from "@/components/organization-switcher"
import { getFlag } from "@/lib/feature-flags"
import { signOut, useSession } from "@/lib/auth-client"
import { useAddons } from "@/lib/use-addons"
import { useSubscriptionAccess } from "@/lib/subscription-context"
import { cn } from "@/lib/utils"

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

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
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

function BrandLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        workspaceHeaderControlClass,
        "rounded-md px-0 font-semibold text-app-fg hover:text-app-fg"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-action text-app-action-foreground">
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
      <SidebarHeader className="border-b border-app-border">
        <BrandLink href={logoHref} />
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

function WorkspaceTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center gap-2 border-b border-app-border bg-app-surface/95 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger aria-label="Alternar navegação" />
      <Breadcrumb className="flex min-w-0 items-center">
        <BreadcrumbList className="flex-nowrap items-center gap-1 sm:gap-2">
          <BreadcrumbItem className="flex h-10 min-w-0 items-center">
            <OrganizationBreadcrumbDropdown />
          </BreadcrumbItem>
          <BreadcrumbSeparator className="flex h-10 items-center text-app-subtle">
            <span className="text-sm leading-none">/</span>
          </BreadcrumbSeparator>
          <BreadcrumbItem className="flex h-10 min-w-0 items-center">
            <GlobalCollectionBreadcrumb />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
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
      <nav
        className="sticky top-0 z-50 border-b border-app-border bg-app-surface/95 backdrop-blur"
        style={{ "--nav-height": "3.5rem" } as React.CSSProperties}
      >
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-4">
          <BrandLink href={logoHref} />
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
                triggerClassName="w-auto border border-app-border bg-app-surface px-3"
              />
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-app-action px-4 py-2 text-sm font-medium text-app-action-foreground transition-colors hover:bg-app-action-hover"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </nav>
      {children}
    </>
  )
}

export function NavBar({ children }: { children?: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { hasAddon } = useAddons()
  const { hasActiveSubscription, subscriptionReady } = useSubscriptionAccess()
  const user = session?.user as SessionUser | undefined
  const isAdmin = user?.isAdmin === true
  const isLoggedIn = !!session?.user
  const hasFloodRisk = hasAddon("flood")
  const showWorkspaceNav =
    isLoggedIn && subscriptionReady && hasActiveSubscription

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  const logoHref = !isLoggedIn
    ? "/"
    : showWorkspaceNav
      ? "/visao-geral"
      : "/subscribe"

  if (!showWorkspaceNav) {
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
      style={{ "--nav-height": "3.5rem" } as React.CSSProperties}
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
        <WorkspaceTopBar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
