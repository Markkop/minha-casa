import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn utility function", () => {
  describe("basic class merging", () => {
    it("returns empty string when no arguments provided", () => {
      expect(cn()).toBe("")
    })

    it("returns single class unchanged", () => {
      expect(cn("foo")).toBe("foo")
    })

    it("merges multiple classes", () => {
      expect(cn("foo", "bar")).toBe("foo bar")
    })

    it("handles undefined values", () => {
      expect(cn("foo", undefined, "bar")).toBe("foo bar")
    })

    it("handles null values", () => {
      expect(cn("foo", null, "bar")).toBe("foo bar")
    })

    it("handles false values", () => {
      expect(cn("foo", false, "bar")).toBe("foo bar")
    })
  })

  describe("conditional classes", () => {
    it("includes class when condition is true", () => {
      expect(cn("base", true && "conditional")).toBe("base conditional")
    })

    it("excludes class when condition is false", () => {
      expect(cn("base", false && "conditional")).toBe("base")
    })
  })

  describe("object syntax", () => {
    it("includes classes with truthy values", () => {
      expect(cn({ foo: true, bar: true })).toBe("foo bar")
    })

    it("excludes classes with falsy values", () => {
      expect(cn({ foo: true, bar: false })).toBe("foo")
    })

    it("handles mixed object and string syntax", () => {
      expect(cn("base", { conditional: true })).toBe("base conditional")
    })
  })

  describe("array syntax", () => {
    it("flattens arrays of classes", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar")
    })

    it("handles nested arrays", () => {
      expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz")
    })
  })

  describe("Tailwind class conflict resolution", () => {
    it("resolves conflicting padding classes", () => {
      expect(cn("p-4", "p-2")).toBe("p-2")
    })

    it("resolves conflicting margin classes", () => {
      expect(cn("m-4", "m-8")).toBe("m-8")
    })

    it("resolves conflicting text color classes", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
    })

    it("resolves conflicting background color classes", () => {
      expect(cn("bg-white", "bg-black")).toBe("bg-black")
    })

    it("resolves conflicting width classes", () => {
      expect(cn("w-full", "w-1/2")).toBe("w-1/2")
    })

    it("resolves conflicting display classes", () => {
      expect(cn("block", "flex")).toBe("flex")
    })

    it("keeps non-conflicting classes", () => {
      expect(cn("p-4", "m-4", "text-lg")).toBe("p-4 m-4 text-lg")
    })

    it("handles complex real-world example", () => {
      const base = "px-4 py-2 rounded-lg bg-primary text-white"
      const override = "bg-secondary text-black"
      expect(cn(base, override)).toBe(
        "px-4 py-2 rounded-lg bg-secondary text-black"
      )
    })
  })

  describe("responsive variants", () => {
    it("keeps different responsive variants", () => {
      expect(cn("text-sm", "md:text-lg")).toBe("text-sm md:text-lg")
    })

    it("resolves conflicting responsive variants", () => {
      expect(cn("md:text-sm", "md:text-lg")).toBe("md:text-lg")
    })
  })

  describe("state variants", () => {
    it("keeps different state variants", () => {
      expect(cn("bg-blue-500", "hover:bg-blue-600")).toBe(
        "bg-blue-500 hover:bg-blue-600"
      )
    })

    it("resolves conflicting state variants", () => {
      expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe(
        "hover:bg-blue-500"
      )
    })
  })
})
