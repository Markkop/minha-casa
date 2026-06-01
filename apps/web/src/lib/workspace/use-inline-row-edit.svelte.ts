export function useInlineRowEdit<T extends { id: string }>() {
  let editingId = $state<string | null>(null);
  let draft = $state<T | null>(null);

  function startEdit(item: T) {
    editingId = item.id;
    draft = { ...item };
  }

  function cancelEdit() {
    editingId = null;
    draft = null;
  }

  function isEditing(id: string) {
    return editingId === id;
  }

  function updateDraft(patch: Partial<T>) {
    if (draft) draft = { ...draft, ...patch };
  }

  return {
    get editingId() {
      return editingId;
    },
    get draft() {
      return draft;
    },
    startEdit,
    cancelEdit,
    isEditing,
    updateDraft,
    setDraft(value: T | null) {
      draft = value;
    }
  };
}
