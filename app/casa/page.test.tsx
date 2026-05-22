import { describe, it, expect, vi } from "vitest"
import CasaPage from "./page"
import { redirect } from "next/navigation"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

describe("CasaPage", () => {
  it("redirects legacy /casa traffic to /financiamento", () => {
    CasaPage()

    expect(redirect).toHaveBeenCalledWith("/financiamento")
  })
})
