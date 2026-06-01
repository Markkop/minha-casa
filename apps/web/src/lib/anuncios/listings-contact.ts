export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  return digits.length > 0 ? digits : null
}

export function buildWhatsAppUrl(contactNumber: string | null | undefined): string | null {
  const normalized = normalizePhoneNumber(contactNumber)
  if (!normalized) return null
  return `https://wa.me/55${normalized}`
}
