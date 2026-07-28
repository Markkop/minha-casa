import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Collection, WorkspaceProfile } from "$lib/workspace/client";
import {
  findCollectionDestination,
  loadWritableCollectionDestinations
} from "$lib/workspace/collection-destinations";

const workspaceApiMock = vi.hoisted(() => ({
  fetchProfiles: vi.fn(),
  fetchCollections: vi.fn()
}));

vi.mock("$lib/workspace/client", () => ({ workspaceApi: workspaceApiMock }));

function profile(
  workspaceId: string,
  label: string,
  type: WorkspaceProfile["type"],
  overrides: Partial<WorkspaceProfile> = {}
): WorkspaceProfile {
  return {
    id: workspaceId,
    workspaceId,
    label,
    type,
    status: "active",
    access: "owner",
    ...overrides
  };
}

function collection(id: string, workspaceId: string, name: string): Collection {
  return {
    id,
    workspaceId,
    userId: "user-1",
    orgId: null,
    name,
    isPublic: false,
    shareToken: null,
    isDefault: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("writable collection destinations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active personal, professional, family, and agency profiles with explicit routing", async () => {
    workspaceApiMock.fetchProfiles.mockResolvedValue({
      activeWorkspaceId: "workspace-personal",
      profiles: [
        profile("workspace-personal", "Pessoal", "personal"),
        profile("workspace-professional", "Meu trabalho", "professional"),
        profile("workspace-family", "Família Kopmann", "family", {
          organizationId: "organization-family",
          access: "admin"
        }),
        profile("workspace-agency", "Imobiliária Central", "agency", {
          organizationId: "organization-agency",
          access: "broker"
        })
      ]
    });
    workspaceApiMock.fetchCollections.mockImplementation(
      async ({ workspaceId }: { workspaceId: string; organizationId: string | null }) => ({
        collections:
          workspaceId === "workspace-personal"
            ? [collection("collection-personal", workspaceId, "Favoritos")]
            : workspaceId === "workspace-professional"
              ? [collection("collection-professional", workspaceId, "Clientes")]
              : workspaceId === "workspace-family"
                ? [collection("collection-family", workspaceId, "Mudança")]
                : [collection("collection-agency", workspaceId, "Carteira")]
      })
    );

    const destinations = await loadWritableCollectionDestinations();

    expect(workspaceApiMock.fetchProfiles).toHaveBeenCalledOnce();
    expect(workspaceApiMock.fetchCollections.mock.calls).toEqual([
      [{ workspaceId: "workspace-personal", organizationId: null }],
      [{ workspaceId: "workspace-professional", organizationId: null }],
      [{ workspaceId: "workspace-family", organizationId: "organization-family" }],
      [{ workspaceId: "workspace-agency", organizationId: "organization-agency" }]
    ]);
    expect(destinations).toEqual([
      expect.objectContaining({
        workspaceId: "workspace-personal",
        organizationId: null,
        profileLabel: "Pessoal",
        label: "Favoritos - Pessoal",
        collection: expect.objectContaining({ id: "collection-personal" })
      }),
      expect.objectContaining({
        workspaceId: "workspace-professional",
        organizationId: null,
        profileLabel: "Meu trabalho",
        label: "Clientes - Meu trabalho",
        collection: expect.objectContaining({ id: "collection-professional" })
      }),
      expect.objectContaining({
        workspaceId: "workspace-family",
        organizationId: "organization-family",
        profileLabel: "Família Kopmann",
        label: "Mudança - Família Kopmann",
        collection: expect.objectContaining({ id: "collection-family" })
      }),
      expect.objectContaining({
        workspaceId: "workspace-agency",
        organizationId: "organization-agency",
        profileLabel: "Imobiliária Central",
        label: "Carteira - Imobiliária Central",
        collection: expect.objectContaining({ id: "collection-agency" })
      })
    ]);
  });

  it("deduplicates collection IDs and excludes frozen, archived, external, and read-only profiles", async () => {
    workspaceApiMock.fetchProfiles.mockResolvedValue({
      activeWorkspaceId: "workspace-personal",
      profiles: [
        profile("workspace-personal", "Pessoal", "personal"),
        profile("workspace-professional", "Profissional", "professional"),
        profile("workspace-frozen", "Congelado", "professional", { status: "frozen" }),
        profile("workspace-archived", "Arquivado", "agency", {
          status: "archived",
          organizationId: "organization-archived"
        }),
        profile("workspace-external", "Compartilhado", "external", { access: "external" }),
        profile("workspace-external-access", "Acesso externo", "family", {
          organizationId: "organization-external",
          access: "external"
        }),
        profile("workspace-viewer", "Somente leitura", "family", {
          organizationId: "organization-viewer",
          access: "viewer"
        })
      ]
    });
    workspaceApiMock.fetchCollections.mockImplementation(
      async ({ workspaceId }: { workspaceId: string; organizationId: string | null }) => ({
        collections:
          workspaceId === "workspace-personal"
            ? [collection("collection-shared", workspaceId, "Favoritos")]
            : [
                collection("collection-shared", workspaceId, "Favoritos duplicados"),
                collection("collection-professional", workspaceId, "Clientes")
              ]
      })
    );

    const destinations = await loadWritableCollectionDestinations();

    expect(workspaceApiMock.fetchCollections.mock.calls).toEqual([
      [{ workspaceId: "workspace-personal", organizationId: null }],
      [{ workspaceId: "workspace-professional", organizationId: null }]
    ]);
    expect(destinations.map(({ collection: item }) => item.id)).toEqual([
      "collection-shared",
      "collection-professional"
    ]);
    expect(destinations[0]).toMatchObject({
      workspaceId: "workspace-personal",
      profileLabel: "Pessoal",
      label: "Favoritos - Pessoal"
    });
    expect(new Set(destinations.map(({ collection: item }) => item.id)).size).toBe(
      destinations.length
    );
  });

  it("excludes archived collections and an explicitly excluded source collection", async () => {
    workspaceApiMock.fetchProfiles.mockResolvedValue({
      activeWorkspaceId: "workspace-personal",
      profiles: [profile("workspace-personal", "Pessoal", "personal")]
    });
    workspaceApiMock.fetchCollections.mockResolvedValue({
      collections: [
        collection("collection-source", "workspace-personal", "Origem"),
        { ...collection("collection-archived", "workspace-personal", "Arquivada"), status: "archived" },
        collection("collection-target", "workspace-personal", "Destino")
      ]
    });

    const destinations = await loadWritableCollectionDestinations({
      excludeCollectionId: "collection-source"
    });

    expect(destinations.map(({ collection: item }) => item.id)).toEqual(["collection-target"]);
    expect(findCollectionDestination(destinations, "collection-target")).toBe(destinations[0]);
    expect(findCollectionDestination(destinations, "collection-source")).toBeNull();
    expect(findCollectionDestination(destinations, null)).toBeNull();
  });
});
