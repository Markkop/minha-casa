"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3, Contact, Home, Link2, MapPinned } from "lucide-react"
import { WorkspacePage, WorkspacePanel } from "@/app/components/workspace-ui"
import {
  fetchCondominiums,
  fetchContacts,
  fetchRegions,
  fetchSavedLinks,
  type Condominium,
  type Contact as WorkspaceContact,
  type Region,
  type SavedLink,
} from "@/lib/workspace/client"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"

export function OverviewClient() {
  const { orgId } = useWorkspaceProfile()
  const [links, setLinks] = useState<SavedLink[]>([])
  const [contacts, setContacts] = useState<WorkspaceContact[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [condominiums, setCondominiums] = useState<Condominium[]>([])

  useEffect(() => {
    async function load() {
      const [linksData, contactsData, regionsData, condominiumsData] = await Promise.all([
        fetchSavedLinks(orgId),
        fetchContacts(orgId),
        fetchRegions(orgId),
        fetchCondominiums(orgId),
      ])
      setLinks(linksData.links)
      setContacts(contactsData.contacts)
      setRegions(regionsData.regions)
      setCondominiums(condominiumsData.condominiums)
    }

    void load()
  }, [orgId])

  const nextSteps = useMemo(
    () => [
      {
        title: "Importar ou revisar anúncios",
        description: "Use a coleção ativa no topo para revisar e adicionar imóveis.",
        href: "/anuncios",
        icon: Home,
      },
      {
        title: "Comparar favoritos",
        description: "Monte a comparação com os imóveis da coleção ativa.",
        href: "/comparacao",
        icon: BarChart3,
      },
      {
        title: "Completar referências de região",
        description: missingRegionCount > 0
          ? `${missingRegionCount} favorito(s) sem região vinculada.`
          : `${regions.length} região(ões) cadastrada(s).`,
        href: "/regioes",
        icon: MapPinned,
      },
      {
        title: "Organizar contatos e links",
        description: `${contacts.length} contato(s), ${links.length} link(s) e ${condominiums.length} condomínio(s) salvos.`,
        href: "/contatos",
        icon: Contact,
      },
    ],
    [condominiums.length, contacts.length, links.length, regions.length]
  )

  return (
    <WorkspacePage>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Links" value={links.length} />
        <Stat label="Contatos" value={contacts.length} />
        <Stat label="Regiões" value={regions.length} />
        <Stat label="Condomínios" value={condominiums.length} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <WorkspacePanel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-app-fg">Próximos passos</h2>
            <Link href="/links" className="inline-flex items-center gap-1 text-sm font-medium text-app-muted hover:text-app-fg">
              Links <Link2 className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {nextSteps.map((step) => {
              const Icon = step.icon
              return (
                <Link key={step.href} href={step.href} className="group rounded-lg border border-app-border p-4 transition-colors hover:border-app-border-strong hover:bg-app-bg">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-app-action text-app-action-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-medium text-app-fg">{step.title}</h3>
                      <p className="mt-1 text-sm text-app-muted">{step.description}</p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-app-subtle transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="p-4">
          <h2 className="font-semibold text-app-fg">Referências do workspace</h2>
          <div className="mt-3 space-y-3 text-sm">
            <Row label="Links salvos" value={links.length} href="/links" />
            <Row label="Contatos cadastrados" value={contacts.length} href="/contatos" />
            <Row label="Regiões cadastradas" value={regions.length} href="/regioes" />
            <Row label="Condomínios mapeados" value={condominiums.length} href="/condominios" />
          </div>
        </WorkspacePanel>
      </div>
    </WorkspacePage>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <WorkspacePanel className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-app-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-app-fg">{value}</div>
    </WorkspacePanel>
  )
}

function Row({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-md border border-app-border px-3 py-2 hover:bg-app-bg">
      <span className="text-app-muted">{label}</span>
      <span className="font-semibold text-app-fg">{value}</span>
    </Link>
  )
}
