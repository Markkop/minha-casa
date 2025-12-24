"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/", label: "Início", icon: "🏡" },
  { href: "/casa", label: "Simulador", icon: "📊" },
  { href: "/anuncios", label: "Anúncios", icon: "🏘️" },
]

export function NavBar() {
  const pathname = usePathname()

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

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
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
        </div>
      </div>
    </nav>
  )
}

