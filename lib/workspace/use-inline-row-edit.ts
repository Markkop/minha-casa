"use client"

import { useCallback, useState } from "react"

export function useInlineRowEdit<T extends { id: string }>() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<T | null>(null)

  const startEdit = useCallback((item: T) => {
    setEditingId(item.id)
    setDraft({ ...item })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setDraft(null)
  }, [])

  const isEditing = useCallback((id: string) => editingId === id, [editingId])

  const updateDraft = useCallback((patch: Partial<T>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }, [])

  return {
    editingId,
    draft,
    startEdit,
    cancelEdit,
    isEditing,
    updateDraft,
    setDraft,
  }
}
