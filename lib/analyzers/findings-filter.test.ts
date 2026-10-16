import { describe, expect, it } from "vitest"
import { filterFindings } from "./findings-filter"

const findings = [
  { id: "1", category: "Security", severity: "high" },
  { id: "2", category: "Security", severity: "low" },
  { id: "3", category: "Testing", severity: "high" },
  { id: "4", category: "Documentation", severity: "info" },
]

describe("filterFindings", () => {
  it("returns all findings when no filters are active", () => {
    expect(filterFindings(findings)).toEqual(findings)
  })

  it("filters by category", () => {
    expect(filterFindings(findings, { category: "Security" }).map((item) => item.id)).toEqual(["1", "2"])
  })

  it("filters by severity", () => {
    expect(filterFindings(findings, { severity: "high" }).map((item) => item.id)).toEqual(["1", "3"])
  })

  it("combines category and severity filters", () => {
    expect(filterFindings(findings, { category: "Security", severity: "high" }).map((item) => item.id)).toEqual(["1"])
  })

  it("clears a category filter while preserving severity", () => {
    expect(filterFindings(findings, { category: null, severity: "high" }).map((item) => item.id)).toEqual(["1", "3"])
  })
})
