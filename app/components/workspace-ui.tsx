"use client"

import { useEffect, type ReactNode } from "react"
import {
  PageToolbar,
  PageToolbarEnd,
} from "@/app/components/page-toolbar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Pencil, X } from "lucide-react"

/** Fits 2 icon buttons (edit + delete) */
export const WORKSPACE_TABLE_ACTIONS_WIDTH = "96px"

/** Fits 3 icon buttons (e.g. open + edit + delete) */
export const WORKSPACE_TABLE_ACTIONS_WIDTH_WIDE = "140px"

const tableCellClass = "px-3 py-1.5 align-middle min-w-0"
const tableHeadClass =
  "px-3 py-2 text-left align-middle text-xs font-medium uppercase tracking-wide text-app-muted"

export function WorkspacePage({
  toolbar,
  children,
}: {
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="min-h-[calc(100vh-56px)] bg-app-bg text-app-fg">
      {toolbar && (
        <PageToolbar maxWidthClassName="max-w-[1500px]">
          <PageToolbarEnd className="w-full">{toolbar}</PageToolbarEnd>
        </PageToolbar>
      )}
      <div className="mx-auto w-full max-w-[1500px] px-4 py-4">{children}</div>
    </main>
  )
}

export function WorkspaceIntroCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-4 rounded-lg border border-app-border bg-app-surface px-4 py-3 text-sm text-app-muted",
        className
      )}
    >
      {children}
    </div>
  )
}

export function WorkspacePanel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("rounded-lg border border-app-border bg-app-surface shadow-sm", className)}>
      {children}
    </section>
  )
}

export type WorkspaceTableColumn<T> = {
  id: string
  header: string
  /** Column width for table-layout: fixed (e.g. "24%" or "104px") */
  width: string
  renderView: (row: T) => ReactNode
  renderEdit?: (row: T, onChange: (patch: Partial<T>) => void) => ReactNode
}

export function WorkspaceDataTable<T>({
  columns,
  className,
  minWidth = "720px",
  actionsWidth = WORKSPACE_TABLE_ACTIONS_WIDTH,
  children,
}: {
  columns: WorkspaceTableColumn<T>[]
  className?: string
  minWidth?: string
  actionsWidth?: string
  children: ReactNode
}) {
  return (
    <WorkspacePanel className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed border-collapse text-sm"
          style={{ minWidth }}
        >
          <colgroup>
            {columns.map((col) => (
              <col key={col.id} style={{ width: col.width }} />
            ))}
            <col style={{ width: actionsWidth }} />
          </colgroup>
          {children}
        </table>
      </div>
    </WorkspacePanel>
  )
}

export function WorkspaceDataTableHeader<T>({
  columns,
}: {
  columns: WorkspaceTableColumn<T>[]
}) {
  return (
    <thead className="border-b border-app-border bg-app-bg">
      <tr>
        {columns.map((col) => (
          <th key={col.id} scope="col" className={tableHeadClass}>
            {col.header}
          </th>
        ))}
        <th scope="col" className={cn(tableHeadClass, "text-right")}>
          Ações
        </th>
      </tr>
    </thead>
  )
}

export function WorkspaceDataTableBody({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <tbody className={className}>{children}</tbody>
}

export function WorkspaceDataTableRow({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <tr className={cn("border-b border-app-border last:border-b-0", className)}>
      {children}
    </tr>
  )
}

export function WorkspaceTableCell({
  children,
  className,
  title,
  inputCell,
}: {
  children?: ReactNode
  className?: string
  title?: string
  /** Skip truncate wrapper so inputs align with header text */
  inputCell?: boolean
}) {
  return (
    <td className={cn(tableCellClass, className)} title={title}>
      {inputCell ? (
        children
      ) : (
        <div className="truncate">{children}</div>
      )}
    </td>
  )
}

export function WorkspaceTableInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return <Input className={cn("h-8 w-full min-w-0 text-sm", className)} {...props} />
}

export function WorkspaceTableIconButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("h-8 w-8 shrink-0", className)}
      {...props}
    />
  )
}

export function WorkspaceTableActions({ children }: { children: ReactNode }) {
  return (
    <td className="whitespace-nowrap px-2 py-1.5 align-middle text-right">
      <div className="flex flex-nowrap items-center justify-end gap-1.5">{children}</div>
    </td>
  )
}

export function WorkspaceTableSaveCancel({
  onSave,
  onCancel,
  saving,
}: {
  onSave: () => void
  onCancel: () => void
  saving?: boolean
}) {
  return (
    <WorkspaceTableActions>
      <WorkspaceTableIconButton onClick={onSave} disabled={saving} title="Salvar">
        <Check className="h-4 w-4" />
      </WorkspaceTableIconButton>
      <WorkspaceTableIconButton onClick={onCancel} disabled={saving} title="Cancelar">
        <X className="h-4 w-4" />
      </WorkspaceTableIconButton>
    </WorkspaceTableActions>
  )
}

export function WorkspaceEditButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <WorkspaceTableIconButton onClick={onClick} disabled={disabled} title="Editar">
      <Pencil className="h-4 w-4" />
    </WorkspaceTableIconButton>
  )
}

export function WorkspaceTableEmpty({
  colSpan,
  children,
}: {
  colSpan: number
  children: ReactNode
}) {
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="px-3 py-4 text-sm text-app-muted">
          {children}
        </td>
      </tr>
    </tbody>
  )
}

export function useEscapeToCancel(enabled: boolean, onCancel: () => void) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [enabled, onCancel])
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-app-muted">{children}</label>
}
