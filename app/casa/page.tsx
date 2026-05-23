import { redirect } from "next/navigation"

export default async function CasaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v))
    } else {
      query.set(key, value)
    }
  }
  const qs = query.toString()
  redirect(qs ? `/financiamento?${qs}` : "/financiamento")
}
