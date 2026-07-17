import { describe, expect, it } from "vitest";
import {
  hasAnyProfileListings,
  resolveClipboardProfileKey,
  shouldAutoProbe,
  shouldPulseClipboardButton
} from "./clipboard-auto-detect-policy";

describe("resolveClipboardProfileKey", () => {
  it("scopes personal profiles by user", () => {
    expect(resolveClipboardProfileKey([{ userId: "user-1", orgId: null }])).toBe("user:user-1");
  });

  it("scopes organization profiles by organization", () => {
    expect(resolveClipboardProfileKey([{ userId: null, orgId: "org-1" }])).toBe("org:org-1");
  });

  it("prefers organization ownership when both identifiers are present", () => {
    expect(resolveClipboardProfileKey([{ userId: "user-1", orgId: "org-1" }])).toBe("org:org-1");
  });

  it("does not create a shared key without an owner", () => {
    expect(resolveClipboardProfileKey([])).toBeNull();
  });
});

describe("hasAnyProfileListings", () => {
  it("finds listings in a non-active collection", () => {
    expect(
      hasAnyProfileListings(
        [{ listingsCount: 0 }, { listingsCount: 3 }, { listingsCount: 0 }],
        0
      )
    ).toBe(true);
  });

  it("uses the active list count while collection counters are empty or stale", () => {
    expect(hasAnyProfileListings([{ listingsCount: 0 }], 1)).toBe(true);
  });

  it("returns false for a profile with no listings", () => {
    expect(hasAnyProfileListings([{ listingsCount: 0 }, {}], 0)).toBe(false);
  });
});

describe("shouldAutoProbe", () => {
  it.each([
    { enabled: true, activated: true, expected: true },
    { enabled: true, activated: false, expected: false },
    { enabled: false, activated: true, expected: false },
    { enabled: false, activated: false, expected: false }
  ])(
    "returns $expected when enabled=$enabled and activated=$activated",
    ({ enabled, activated, expected }) => {
      expect(shouldAutoProbe({ enabled, activated })).toBe(expected);
    }
  );
});

describe("shouldPulseClipboardButton", () => {
  it("pulses for an empty profile even without a clipboard match", () => {
    expect(shouldPulseClipboardButton({ hasAnyListings: false, hasMatch: false })).toBe(true);
  });

  it("pulses when clipboard content matches even if the profile has listings", () => {
    expect(shouldPulseClipboardButton({ hasAnyListings: true, hasMatch: true })).toBe(true);
  });

  it("stays still when the profile has listings and there is no match", () => {
    expect(shouldPulseClipboardButton({ hasAnyListings: true, hasMatch: false })).toBe(false);
  });
});
