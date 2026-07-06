import { describe, expect, it } from "vitest";
import {
  buildInviteUrl,
  bumpOrganizationMemberCount,
  organizationRoleLabel,
  pickInitialOrganizationId
} from "./helpers";
import type { Organization } from "$lib/workspace/client";

function org(partial: Partial<Organization> & Pick<Organization, "id">): Organization {
  const role = partial.role ?? "member";
  return {
    id: partial.id,
    name: partial.name ?? "Org",
    slug: partial.slug ?? "org",
    role,
    userRole: partial.userRole ?? role,
    ownerId: partial.ownerId ?? "owner-1",
    joinedAt: partial.joinedAt ?? "2026-01-01T00:00:00.000Z",
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
    memberCount: partial.memberCount ?? 1,
    collectionsCount: partial.collectionsCount ?? 0,
    listingsCount: partial.listingsCount ?? 0
  };
}

describe("pickInitialOrganizationId", () => {
  const organizations = [org({ id: "a" }), org({ id: "b" }), org({ id: "c" })];

  it("prefers an existing selected organization", () => {
    expect(
      pickInitialOrganizationId(organizations, { selectedOrgId: "b", activeOrgId: "a" })
    ).toBe("b");
  });

  it("falls back to active organization then first list item", () => {
    expect(pickInitialOrganizationId(organizations, { activeOrgId: "c" })).toBe("c");
    expect(pickInitialOrganizationId(organizations, {})).toBe("a");
    expect(pickInitialOrganizationId([], {})).toBeNull();
  });
});

describe("organizationRoleLabel", () => {
  it("maps roles to Portuguese labels", () => {
    expect(organizationRoleLabel("owner")).toBe("Dono");
    expect(organizationRoleLabel("admin")).toBe("Admin");
    expect(organizationRoleLabel("member")).toBe("Membro");
  });
});

describe("bumpOrganizationMemberCount", () => {
  it("updates member count without going below zero", () => {
    const organizations = [org({ id: "a", memberCount: 1 }), org({ id: "b", memberCount: 4 })];
    const increased = bumpOrganizationMemberCount(organizations, "b", 2);
    expect(increased.find((item) => item.id === "b")?.memberCount).toBe(6);

    const decreased = bumpOrganizationMemberCount(increased, "a", -5);
    expect(decreased.find((item) => item.id === "a")?.memberCount).toBe(0);
  });
});

describe("buildInviteUrl", () => {
  it("builds a same-origin invite URL and encodes the token", () => {
    expect(buildInviteUrl("abc/123", "https://app.example.com/")).toBe(
      "https://app.example.com/convites/abc%2F123"
    );
  });
});
