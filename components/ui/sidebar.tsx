"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { PanelLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const SIDEBAR_WIDTH = "11rem"

type SidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const [open, setOpen] = React.useState(true)
  const [openMobile, setOpenMobile] = React.useState(false)
  const toggleSidebar = React.useCallback(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setOpen((value) => !value)
      return
    }
    setOpenMobile((value) => !value)
  }, [])

  const value = React.useMemo(
    () => ({ open, setOpen, openMobile, setOpenMobile, toggleSidebar }),
    [open, openMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            ...style,
          } as React.CSSProperties
        }
        className={cn("min-h-svh bg-app-bg text-app-fg", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  className,
  children,
  side = "left",
  ...props
}: React.ComponentProps<"aside"> & {
  side?: "left" | "right"
}) {
  const { open, openMobile, setOpenMobile } = useSidebar()

  return (
    <>
      <aside
        data-slot="sidebar"
        className={cn(
          "fixed inset-y-0 z-50 hidden w-[var(--sidebar-width)] flex-col border-app-border bg-app-surface text-app-fg md:flex",
          !open && "md:hidden",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className
        )}
        {...props}
      >
        {children}
      </aside>
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side={side}
          showCloseButton={false}
          className="w-[min(86vw,var(--sidebar-width))] gap-0 p-0"
        >
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <SheetDescription className="sr-only">
            Seções do workspace
          </SheetDescription>
          <aside
            data-slot="sidebar-mobile"
            className={cn(
              "flex h-full w-full flex-col bg-app-surface text-app-fg",
              className
            )}
          >
            {children}
          </aside>
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { open } = useSidebar()

  return (
    <div
      data-slot="sidebar-inset"
      className={cn(
        "min-h-svh",
        open && "md:pl-[var(--sidebar-width)]",
        className
      )}
      {...props}
    />
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9 text-app-muted hover:text-app-fg", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Alternar navegação</span>
    </Button>
  )
}

function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("box-border flex shrink-0 items-center px-3", className)}
      {...props}
    />
  )
}

function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("min-h-0 flex-1 overflow-y-auto px-2 py-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("mt-auto shrink-0 border-t border-app-border p-2", className)}
      {...props}
    />
  )
}

function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
}

function SidebarMenuButton({
  className,
  asChild = false,
  isActive = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        "flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
        isActive
          ? "bg-app-surface-muted text-app-fg"
          : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg",
        className
      )}
      {...props}
    />
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-rail"
      className={cn("hidden", className)}
      {...props}
    />
  )
}

export {
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
}
