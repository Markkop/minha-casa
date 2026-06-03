import type { Imovel } from "$lib/anuncios/types";

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

export function extractUniqueContacts(listings: Imovel[]) {
  const contactMap = new Map<string, { name: string | null; number: string }>();

  for (const listing of listings) {
    if (listing.contactNumber) {
      const normalized = listing.contactNumber.replace(/\D/g, "");
      if (normalized && !contactMap.has(normalized)) {
        contactMap.set(normalized, {
          name: listing.contactName || null,
          number: listing.contactNumber
        });
      }
    }
  }

  return Array.from(contactMap.values()).sort((a, b) => {
    const nameA = a.name || a.number;
    const nameB = b.name || b.number;
    return nameA.localeCompare(nameB);
  });
}
