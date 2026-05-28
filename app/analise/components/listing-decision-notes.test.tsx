"use client"

import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  ListingDecisionNotesProvider,
  ListingNotesCard,
  ListingProsConsCard,
} from "./listing-decision-notes"

const mockFetchComparisonNotes = vi.fn()
const mockSaveComparisonNote = vi.fn()

vi.mock("@/lib/workspace/client", () => ({
  fetchComparisonNotes: (...args: unknown[]) => mockFetchComparisonNotes(...args),
  saveComparisonNote: (...args: unknown[]) => mockSaveComparisonNote(...args),
}))

function renderNotes() {
  return render(
    <ListingDecisionNotesProvider listingId="listing-1" orgId="org-1">
      <ListingProsConsCard />
      <ListingNotesCard />
    </ListingDecisionNotesProvider>
  )
}

describe("ListingDecisionNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchComparisonNotes.mockResolvedValue({
      notes: [
        {
          id: "note-1",
          listingId: "listing-1",
          pros: ["boa planta"],
          cons: ["barulho"],
          notes: "visitar de manhã",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    })
    mockSaveComparisonNote.mockResolvedValue({
      note: {
        id: "note-1",
        listingId: "listing-1",
        pros: ["ótima luz"],
        cons: ["barulho"],
        notes: "visitar de manhã",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    })
  })

  it("loads existing notes for the selected listing", async () => {
    renderNotes()

    expect(await screen.findByLabelText("Vantagens")).toHaveValue("boa planta")
    expect(screen.getByLabelText("Desvantagens")).toHaveValue("barulho")
    expect(screen.getByLabelText("Notas")).toHaveValue("visitar de manhã")
  })

  it("saves pros, cons, and notes together", async () => {
    renderNotes()
    await screen.findByLabelText("Vantagens")

    fireEvent.change(screen.getByLabelText("Vantagens"), {
      target: { value: "ótima luz" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(mockSaveComparisonNote).toHaveBeenCalledWith(
        {
          listingId: "listing-1",
          pros: ["ótima luz"],
          cons: ["barulho"],
          notes: "visitar de manhã",
        },
        "org-1"
      )
    })
  })
})
