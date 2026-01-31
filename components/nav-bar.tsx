"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "@/lib/auth-client"
import { OrganizationSwitcher } from "@/components/organization-switcher"
import { getFlag } from "@/lib/feature-flags"
import { useAddons } from "@/lib/use-addons"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface NavLink {
  href: string
  label: string
  icon: string
  /** Addon slug to check for access (user OR org) */
  addonSlug?: "financiamento" | "flood"
  requiresAuth?: boolean
}

const navLinks: NavLink[] = [
  { href: "/casa", label: "Simulador", icon: "📊", addonSlug: "financiamento" },
  { href: "/anuncios", label: "Anuncios", icon: "🏘️", requiresAuth: true },
  { href: "/floodrisk", label: "Risco Enchente", icon: "🌊", addonSlug: "flood" },
]

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { hasAddon, userAddons, orgAddons } = useAddons()
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true
  const isLoggedIn = !!session?.user

  // Filter nav links based on addon access and auth requirements
  const visibleLinks = navLinks.filter((link) => {
    if (link.requiresAuth && !isLoggedIn) return false
    if (!link.addonSlug) return true
    return hasAddon(link.addonSlug)
  })

  // Get addon shortcuts for the user menu - only enabled addons the user has access to
  const addonShortcuts = navLinks.filter((link) => {
    if (!link.addonSlug) return false
    // Check if user has this addon enabled (from user or org addons)
    const hasUserAddon = userAddons.some(
      (addon) => addon.addonSlug === link.addonSlug && addon.enabled
    )
    const hasOrgAddon = orgAddons.some(
      (addon) => addon.addonSlug === link.addonSlug && addon.enabled
    )
    return hasUserAddon || hasOrgAddon
  })

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="border-b border-brightGrey bg-raisinBlack">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-primary hover:opacity-80 transition-opacity"
          >
            <span className="text-xl">🏠</span>
            <span>Minha Casa</span>
          </Link>

          {/* Navigation Links, Organization Switcher, and User Menu */}
          <div className="flex items-center gap-4">
            {/* Organization Switcher - Only show when logged in */}
            {isLoggedIn && <OrganizationSwitcher />}

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {visibleLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      "flex items-center gap-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-ashGray hover:text-white hover:bg-eerieBlack"
                    )}
                  >
                    <span>{link.icon}</span>
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* User Menu */}
            {isLoggedIn ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      "bg-eerieBlack border border-brightGrey",
                      "hover:border-primary hover:text-primary",
                      "text-ashGray"
                    )}
                    aria-label="Menu do usuario"
                  >
                    <span>👤</span>
                    <span className="hidden sm:inline max-w-[100px] truncate">
                      {session.user.name || session.user.email}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-2 bg-raisinBlack border-brightGrey"
                  align="end"
                >
                  <div className="px-2 py-1.5 text-sm text-muted-foreground border-b border-brightGrey mb-2 pb-2">
                    <div className="font-medium text-white truncate">
                      {session.user.name}
                    </div>
                    <div className="text-xs truncate">{session.user.email}</div>
                  </div>
                  {/* Addon Shortcuts */}
                  {addonShortcuts.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-muted-foreground uppercase tracking-wide">
                        Meus Addons
                      </div>
                      {addonShortcuts.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm text-ashGray hover:text-white hover:bg-eerieBlack rounded-md transition-colors cursor-pointer"
                        >
                          <span>{link.icon}</span>
                          <span>{link.label}</span>
                        </Link>
                      ))}
                      <div className="border-b border-brightGrey my-2" />
                    </>
                  )}
                  {getFlag("organizations") && (
                    <Link
                      href="/organizacoes"
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-ashGray hover:text-white hover:bg-eerieBlack rounded-md transition-colors cursor-pointer"
                    >
                      <span>👥</span>
                      <span>Organizacoes</span>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-ashGray hover:text-white hover:bg-eerieBlack rounded-md transition-colors cursor-pointer"
                    >
                      <span>⚙️</span>
                      <span>Admin</span>
                    </Link>
                  )}
                  <Link
                    href="/subscribe"
                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-ashGray hover:text-white hover:bg-eerieBlack rounded-md transition-colors cursor-pointer"
                  >
                    <span>💳</span>
                    <span>Assinatura</span>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 px-2 py-1.5 h-auto text-sm text-ashGray hover:text-white hover:bg-eerieBlack cursor-pointer"
                    onClick={handleLogout}
                  >
                    <span>🚪</span>
                    <span>Sair</span>
                  </Button>
                </PopoverContent>
              </Popover>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90"
                )}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

