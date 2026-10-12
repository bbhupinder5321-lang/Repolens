import { describe, expect, it } from "vitest"

import { filterFindings } from "./findings-filter"

const findings = [
  { id: "1", severity: "high", category: "Security" },
  { id: "2", severity: "low", category: "Security" },
  { id: "3", severity: "high", category: "Testing" },
  { id: "4", severity: "info", category: "Documentation" },
]

describe("filterFindings", () => {
  it("returns all findings when no filters are active", () => {
    expect(filterFindings(findings, "all", null)).toEqual(findings)
  })

  it("filters by severity", () => {
    expect(filterFindings(findings, "high", null).map(({ id }) => id)).toEqual([
      "1",
      "3",
    ])
  })

  it("filters by category", () => {
    expect(
      filterFindings(findings, "all", "Security").map(({ id }) => id)
    ).toEqual(["1", "2"])
  })

  it("combines severity and category filters", () => {
    expect(
      filterFindings(findings, "high", "Security").map(({ id }) => id)
    ).toEqual(["1"])
  })

  it("returns an empty list when no finding matches", () => {
    expect(filterFindings(findings, "critical", "Security")).toEqual([])
  })
})
