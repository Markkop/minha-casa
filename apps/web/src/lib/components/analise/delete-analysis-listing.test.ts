import { describe, expect, it, vi } from "vitest";
import { deleteAnalysisListing } from "./delete-analysis-listing";

describe("deleteAnalysisListing", () => {
  it("clears the stored selection and redirects after successful deletion", async () => {
    const removeListing = vi.fn().mockResolvedValue(undefined);
    const clearStoredListing = vi.fn();
    const navigate = vi.fn().mockResolvedValue(undefined);

    await deleteAnalysisListing({
      listingId: "listing-1",
      collectionId: "collection-1",
      removeListing,
      clearStoredListing,
      navigate
    });

    expect(removeListing).toHaveBeenCalledWith("listing-1");
    expect(clearStoredListing).toHaveBeenCalledWith("collection-1");
    expect(navigate).toHaveBeenCalledWith("/anuncios");
  });

  it("does not clear or redirect when deletion fails", async () => {
    const error = new Error("Falha ao excluir");
    const removeListing = vi.fn().mockRejectedValue(error);
    const clearStoredListing = vi.fn();
    const navigate = vi.fn().mockResolvedValue(undefined);

    await expect(
      deleteAnalysisListing({
        listingId: "listing-1",
        collectionId: "collection-1",
        removeListing,
        clearStoredListing,
        navigate
      })
    ).rejects.toBe(error);

    expect(clearStoredListing).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
