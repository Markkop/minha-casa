export function formatListingDate(value: string | undefined) {
  if (!value) return "31 dez 2025"
  try {
    const date = new Date(`${value}T00:00:00`)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return "31 dez 2025"
  }
}

export function formatListingFullDateTime(createdAt: string) {
  try {
    const date = new Date(createdAt)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  } catch {
    return ""
  }
}
