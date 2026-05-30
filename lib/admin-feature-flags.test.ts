import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  ADMIN_FEATURE_FLAGS_STORAGE_KEY,
  defaultAdminFeatureFlags,
  getAdminFlag,
  mergeAdminFlagUpdate,
  parseStoredAdminFlags,
  readAdminFlagsFromStorage,
  writeAdminFlagsToStorage,
} from "./admin-feature-flags"

describe("admin-feature-flags", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null
      },
      setItem(key: string, value: string) {
        this.store[key] = value
      },
      removeItem(key: string) {
        delete this.store[key]
      },
      clear() {
        this.store = {}
      },
    })
    localStorage.clear()
  })

  describe("getAdminFlag", () => {
    it("returns false for non-admin regardless of stored value", () => {
      const flags = { ...defaultAdminFeatureFlags, visaoGeral: true }
      expect(getAdminFlag(flags, "visaoGeral", false)).toBe(false)
    })

    it("returns stored value for admin", () => {
      const flags = { ...defaultAdminFeatureFlags, deepAnalysis: true }
      expect(getAdminFlag(flags, "deepAnalysis", true)).toBe(true)
      expect(getAdminFlag(flags, "contatos", true)).toBe(false)
    })
  })

  describe("parseStoredAdminFlags", () => {
    it("returns defaults when storage is empty", () => {
      expect(parseStoredAdminFlags(null)).toEqual(defaultAdminFeatureFlags)
    })

    it("merges valid boolean keys from JSON", () => {
      const raw = JSON.stringify({ visaoGeral: true, contatos: true, invalid: "x" })
      expect(parseStoredAdminFlags(raw)).toEqual({
        ...defaultAdminFeatureFlags,
        visaoGeral: true,
        contatos: true,
      })
    })

    it("returns defaults on invalid JSON", () => {
      expect(parseStoredAdminFlags("{not json")).toEqual(defaultAdminFeatureFlags)
    })
  })

  describe("localStorage roundtrip", () => {
    it("writes and reads flags", () => {
      const flags = { ...defaultAdminFeatureFlags, regioes: true }
      writeAdminFlagsToStorage(flags)
      expect(localStorage.getItem(ADMIN_FEATURE_FLAGS_STORAGE_KEY)).toBeTruthy()
      expect(readAdminFlagsFromStorage()).toEqual(flags)
    })
  })

  describe("mergeAdminFlagUpdate", () => {
    it("updates a single flag", () => {
      const next = mergeAdminFlagUpdate(defaultAdminFeatureFlags, "condominios", true)
      expect(next.condominios).toBe(true)
      expect(next.visaoGeral).toBe(false)
    })
  })
})
