"use client"

import { useEffect, useState } from "react"
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
  Menu,
  Settings,
  X,
  User,
  Users,
  Waves,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "@/lib/auth-client"
import { OrganizationSwitcher } from "@/components/organization-switcher"
import { getFlag } from "@/lib/feature-flags"
import { useAddons } from "@/lib/use-addons"
import { useSubscriptionAccess } from "@/lib/subscription-context"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

const workspaceLinks: NavLink[] = [
  { href: "/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { href: "/anuncios", label: "Anúncios", icon: Home },
  { href: "/comparacao", label: "Comparação", icon: BarChart3 },
  { href: "/financiamento", label: "Financiamento", icon: CircleDollarSign },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/contatos", label: "Contatos", icon: Contact },
  { href: "/regioes", label: "Regiões", icon: MapPinned },
  { href: "/condominios", label: "Condomínios", icon: Building2 },
]

function WorkspaceNavLink({
  link,
  pathname,
  variant,
  onNavigate,
}: {
  link: NavLink
  pathname: string
  variant: "bar" | "drawer"
  onNavigate?: () => void
}) {
  const Icon = link.icon
  const isActive =
    pathname === link.href || pathname.startsWith(`${link.href}/`)

  return (
    <Link
      href={link.href}
      onClick={() => onNavigate?.()}
      className={cn(
        "flex items-center gap-2 font-medium transition-colors",
        variant === "bar" &&
          "h-9 shrink-0 rounded-md px-3 text-sm",
        variant === "drawer" &&
          "h-10 w-full gap-2 rounded-md px-3 text-sm",
        isActive
          ? "bg-app-action text-app-action-foreground"
          : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{link.label}</span>
    </Link>
  )
}

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { hasAddon } = useAddons()
  const { hasActiveSubscription, subscriptionReady } = useSubscriptionAccess()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true
  const isLoggedIn = !!session?.user
  const hasFloodRisk = hasAddon("flood")
  const showWorkspaceNav =
    isLoggedIn && subscriptionReady && hasActiveSubscription

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

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

  const workspaceNavLinks = workspaceLinks.map((link) => (
    <WorkspaceNavLink
      key={link.href}
      link={link}
      pathname={pathname}
      variant="bar"
    />
  ))

  const workspaceDrawerLinks = workspaceLinks.map((link) => (
    <WorkspaceNavLink
      key={link.href}
      link={link}
      pathname={pathname}
      variant="drawer"
      onNavigate={() => setMenuOpen(false)}
    />
  ))

  return (
    <nav
      className="sticky top-0 z-50 border-b border-app-border bg-app-surface/95 backdrop-blur"
      style={
        {
          "--nav-height": showWorkspaceNav ? "7rem" : "3.5rem",
        } as React.CSSProperties
      }
    >
      <div className="border-b border-app-border">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-4">
          {showWorkspaceNav && (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-app-fg hover:bg-app-surface-muted md:hidden"
                  aria-label="Abrir navegação"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                showCloseButton={false}
                className="w-[min(85vw,280px)] gap-0 p-0 pb-[env(safe-area-inset-bottom)]"
              >
                <SheetHeader className="flex flex-row items-center justify-between gap-0 border-b border-app-border p-0 px-4 py-3">
                  <SheetTitle className="text-base">Navegação</SheetTitle>
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-app-muted hover:text-app-fg"
                      aria-label="Fechar navegação"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                  <SheetDescription className="sr-only">
                    Seções do workspace
                  </SheetDescription>
                </SheetHeader>
                <nav
                  className="flex flex-col gap-0 overflow-y-auto px-2 py-2"
                  aria-label="Navegação do workspace"
                >
                  {workspaceDrawerLinks}
                </nav>
              </SheetContent>
            </Sheet>
          )}

          <Link
            href={logoHref}
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-app-fg hover:text-app-fg"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-app-action text-app-fg">
              <Home className="h-4 w-4" />
            </span>
            <span>Minha Casa</span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            {isLoggedIn && (
              <div className="hidden xl:block">
                <OrganizationSwitcher />
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2">
              {isLoggedIn ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex h-9 items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-medium text-app-fg transition-colors hover:border-app-border-strong hover:bg-app-bg"
                    aria-label="Menu do usuario"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden max-w-[130px] truncate sm:inline">
                      {session.user.name || session.user.email}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-60 border-app-border bg-app-surface p-2 text-app-fg" align="end">
                  <div className="mb-2 border-b border-app-border px-2 py-1.5 text-sm">
                    <div className="truncate font-medium text-app-fg">
                      {session.user.name}
                    </div>
                    <div className="truncate text-xs text-app-muted">
                      {session.user.email}
                    </div>
                  </div>
                  <div className="xl:hidden">
                    <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-app-muted">
                      Perfil
                    </div>
                    <div className="px-2 py-1.5">
                      <OrganizationSwitcher />
                    </div>
                    <div className="my-2 border-b border-app-border" />
                  </div>
                  {hasFloodRisk && (
                    <Link
                      href="/floodrisk"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-app-fg transition-colors hover:bg-app-surface-muted hover:text-app-fg"
                    >
                      <Waves className="h-4 w-4" />
                      <span>Risco enchente</span>
                    </Link>
                  )}
                  {getFlag("organizations") && (
                    <Link
                      href="/organizacoes"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-app-fg transition-colors hover:bg-app-surface-muted hover:text-app-fg"
                    >
                      <Users className="h-4 w-4" />
                      <span>Organizações</span>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-app-fg transition-colors hover:bg-app-surface-muted hover:text-app-fg"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  <Link
                    href="/subscribe"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-app-fg transition-colors hover:bg-app-surface-muted hover:text-app-fg"
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>Assinatura</span>
                  </Link>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-sm text-app-fg hover:bg-app-surface-muted hover:text-app-fg"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </Button>
                </PopoverContent>
              </Popover>
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
        </div>
      </div>
      {showWorkspaceNav && (
        <div className="hidden bg-app-surface md:block">
          <div
            className="mx-auto flex h-12 max-w-[1500px] items-center gap-1 px-4"
            aria-label="Navegação do workspace"
          >
            {workspaceNavLinks}
          </div>
        </div>
      )}
    </nav>
  )
}
