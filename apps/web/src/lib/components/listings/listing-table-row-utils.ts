export function formatNumber(value: number | null, suffix = "") {
  if (value === null) return "—";
  return `${value}${suffix}`;
}

export function formatQuartosSuites(bedrooms: number | null, suites: number | null) {
  if (bedrooms === null && suites === null) return "—";
  const q = bedrooms ?? 0;
  const s = suites ?? 0;
  if (s === 0) return `${q}`;
  return `${q} (${s}s)`;
}

export function formatDate(value: string | undefined) {
  if (!value) return "31 dez 2025";
  try {
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  } catch {
    return "31 dez 2025";
  }
}

export function formatFullDateTime(createdAt: string) {
  try {
    const date = new Date(createdAt);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  } catch {
    return "";
  }
}
