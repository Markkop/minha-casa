import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/admin/client", () => ({ adminApi: {} }));

import { minimumLicenseLimit, validLicenseLimit } from "./use-admin-state.svelte";

describe("organization license limits", () => {
  it("keeps the minimum at ten while the agency uses fewer licenses", () => {
    expect(minimumLicenseLimit({ id: "org-1", name: "Imob", slug: "imob", licensesUsed: 4 })).toBe(10);
  });

  it("does not allow reducing the limit below current usage", () => {
    const minimum = minimumLicenseLimit({
      id: "org-1",
      name: "Imob",
      slug: "imob",
      licensesUsed: 13
    });

    expect(minimum).toBe(13);
    expect(validLicenseLimit("12", minimum)).toBeNull();
    expect(validLicenseLimit("13", minimum)).toBe(13);
  });

  it("rejects fractional and non-numeric limits", () => {
    expect(validLicenseLimit("10.5", 10)).toBeNull();
    expect(validLicenseLimit("not-a-number", 10)).toBeNull();
  });
});
