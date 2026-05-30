// ============================================================================
// GEOCODE SEARCH QUERY BUILDER
// Avoids appending Florianópolis when the address already names another city.
// ============================================================================

export interface GeocodeQueryOptions {
  cidade?: string | null
}

const FLORIANOPOLIS_MARKERS = ["florianópolis", "florianopolis"]

const UF_PATTERN = /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SE|SP|TO)\b/i

const STREET_PREFIX =
  /^\s*(rua|av\.?|avenida|alameda|travessa|rodovia|estrada|servidão|servidao|praça|praca|largo)\b/i

/**
 * True when the address string already carries enough city/state context.
 */
export function hasSufficientLocationContext(address: string): boolean {
  const trimmed = address.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  if (/\bbrasil\b/.test(lower)) return true
  if (UF_PATTERN.test(trimmed)) return true
  if (/[,\s]-\s*(SC|PR|RS|SP|RJ|MG|ES|GO)\b/i.test(trimmed)) return true

  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]
    if (last.length >= 4 && !/^\d+$/.test(last) && !STREET_PREFIX.test(last)) {
      return true
    }
  }

  return false
}

/**
 * Build the string sent to geocoding providers.
 */
export function buildGeocodeSearchQuery(
  address: string,
  options?: GeocodeQueryOptions
): string {
  const trimmed = address.trim()
  if (!trimmed) return trimmed

  const lower = trimmed.toLowerCase()
  if (FLORIANOPOLIS_MARKERS.some((m) => lower.includes(m))) {
    return trimmed
  }

  if (hasSufficientLocationContext(trimmed)) {
    return trimmed
  }

  const cidade = options?.cidade?.trim()
  if (cidade && !lower.includes(cidade.toLowerCase())) {
    if (!hasSufficientLocationContext(`${trimmed}, ${cidade}`)) {
      return `${trimmed}, ${cidade}, SC, Brasil`
    }
    return `${trimmed}, ${cidade}`
  }

  return `${trimmed}, Florianópolis, SC, Brasil`
}
