import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ListingTitleLinks } from "./listing-title-links"

describe("ListingTitleLinks", () => {
  it("links title to analise and shows external icon when link exists", () => {
    render(
      <ListingTitleLinks
        listing={{
          id: "listing-1",
          titulo: "Casa na praia",
          link: "https://portal.example/imovel/1",
        }}
        collectionId="collection-1"
      />
    )

    const analiseLink = screen.getByRole("link", { name: /casa na praia/i })
    expect(analiseLink).toHaveAttribute(
      "href",
      "/analise?collection=collection-1&listing=listing-1"
    )

    const externalLink = screen.getByRole("link", { name: /abrir anúncio original/i })
    expect(externalLink).toHaveAttribute("href", "https://portal.example/imovel/1")
    expect(externalLink).toHaveAttribute("target", "_blank")
  })

  it("hides external icon when listing has no link", () => {
    render(
      <ListingTitleLinks
        listing={{ id: "listing-1", titulo: "Sem link" }}
        collectionId="collection-1"
      />
    )

    expect(screen.queryByRole("link", { name: /abrir anúncio original/i })).not.toBeInTheDocument()
  })
})
