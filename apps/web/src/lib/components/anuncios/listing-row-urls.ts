export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function buildGoogleSearchUrl(
  titulo: string,
  endereco: string,
  m2Totais: number | null,
  quartos: number | null,
  banheiros: number | null
) {
  const normalizedTitle = normalizeText(titulo)
  const normalizedEndereco = normalizeText(endereco)
  const titleParts = normalizedTitle.split(/\s+/).filter(Boolean)
  const enderecoParts = normalizedEndereco.split(/\s+/).filter(Boolean)
  const queryParts = [...titleParts, ...enderecoParts]

  if (m2Totais !== null) {
    queryParts.push(`${m2Totais}m2`)
  }
  if (quartos !== null) {
    queryParts.push(`${quartos}`, "quartos")
  }
  if (banheiros !== null) {
    queryParts.push(`${banheiros}`, "banheiros")
  }

  const query = queryParts.join("+")
  return `https://www.google.com/search?q=${query}`
}

function parseAddressForGoogleMaps(endereco: string): string {
  if (!endereco || endereco.trim() === "") {
    return "Florianópolis, SC, Brasil"
  }

  const normalized = endereco.trim().replace(/\s+/g, " ")
  const abbreviations: Record<string, string> = {
    "\\br\\b": "Rua",
    "\\bav\\b": "Avenida",
    "\\bav\\.\\b": "Avenida",
    "\\bavenida\\b": "Avenida",
    "\\brua\\b": "Rua",
    "\\bal\\b": "Alameda",
    "\\bal\\.\\b": "Alameda",
    "\\btrav\\b": "Travessa",
    "\\btrav\\.\\b": "Travessa",
    "\\bsc\\b": "SC",
    "\\bsanta catarina\\b": "Santa Catarina",
    "\\bflorianopolis\\b": "Florianópolis",
    "\\bflorianópolis\\b": "Florianópolis",
    "\\bfloripa\\b": "Florianópolis",
  }

  let processed = normalized
  for (const [pattern, replacement] of Object.entries(abbreviations)) {
    const regex = new RegExp(pattern, "gi")
    processed = processed.replace(regex, replacement)
  }

  const lowerAddress = processed.toLowerCase()
  const hasCity = /\b(florianópolis|florianopolis|floripa)\b/.test(lowerAddress)
  const hasState = /\b(sc|santa catarina)\b/.test(lowerAddress)
  const hasCountry = /\b(brasil|brazil)\b/.test(lowerAddress)

  let finalAddress = processed

  if (!hasCity && !hasState) {
    const endsWithComma = finalAddress.trim().endsWith(",")
    if (endsWithComma) {
      finalAddress = `${finalAddress.trim().slice(0, -1)}, Florianópolis, SC, Brasil`
    } else {
      finalAddress = `${finalAddress}, Florianópolis, SC, Brasil`
    }
  } else if (hasCity && !hasState) {
    if (!hasCountry) {
      finalAddress = `${finalAddress}, SC, Brasil`
    } else {
      finalAddress = finalAddress.replace(/\b(Brasil|Brazil)\b/i, "SC, Brasil")
    }
  } else if (hasState && !hasCity) {
    const statePattern = /\b(SC|Santa Catarina)\b/i
    if (statePattern.test(finalAddress)) {
      finalAddress = finalAddress.replace(statePattern, "Florianópolis, $1")
    }
    if (!hasCountry) {
      finalAddress = `${finalAddress}, Brasil`
    }
  } else if (!hasCountry && hasCity && hasState) {
    finalAddress = `${finalAddress}, Brasil`
  }

  return finalAddress.trim()
}

export function buildGoogleMapsUrl(endereco: string) {
  const normalizedAddress = parseAddressForGoogleMaps(endereco)
  const encodedAddress = encodeURIComponent(normalizedAddress)
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
}

export function calculatePrecoM2(preco: number | null, m2Totais: number | null) {
  if (preco === null || m2Totais === null || m2Totais === 0) return null
  return Math.round(preco / m2Totais)
}

export function calculatePrecoM2Privado(preco: number | null, m2Privado: number | null) {
  if (preco === null || m2Privado === null || m2Privado === 0) return null
  return Math.round(preco / m2Privado)
}
