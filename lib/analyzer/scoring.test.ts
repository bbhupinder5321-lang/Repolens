import { describe, expect, it } from "vitest"

import {
  calculateCategoryScore,
  calculateRepositoryScore,
  getHealthRating,
} from "./scoring"

import type { AnalysisResult } from "./types"

function makeResult(
  category: string,
  findings: AnalysisResult["findings"] = []
): AnalysisResult {
  return {
    analyzer: `${category} Analyzer`,
    category,
    score: 0,
    findings,
    metrics: {},
    recommendations: [],
  }
}

const COMPLETE_CATEGORIES = [
  "Documentation",
  "Code Structure",
  "Testing",
  "Security",
  "Maintainability",
  "Activity",
  "GitHub Practices",
]

function makeCompleteResults(): AnalysisResult[] {
  return COMPLETE_CATEGORIES.map((category) =>
    makeResult(category)
  )
}

describe("getHealthRating", () => {
  it.each([
    [100, "Excellent"],
    [90, "Excellent"],
    [89, "Healthy"],
    [80, "Healthy"],
    [79, "Good"],
    [70, "Good"],
    [69, "Needs Attention"],
    [60, "Needs Attention"],
    [59, "Weak"],
    [40, "Weak"],
    [39, "Critical"],
    [0, "Critical"],
  ] as const)(
    "maps score %i to %s",
    (score, expected) => {
      expect(getHealthRating(score)).toBe(expected)
    }
  )
})

describe("calculateCategoryScore", () => {
  it("returns 100 when there are no findings", () => {
    expect(
      calculateCategoryScore(
        makeResult("Documentation")
      )
    ).toBe(100)
  })

  it("does not penalize informational findings", () => {
    expect(
      calculateCategoryScore(
        makeResult("Documentation", [
          {
            id: "test-info",
            category: "Documentation",
            severity: "info",
            title: "Informational finding",
            description: "This is informational.",
          },
        ])
      )
    ).toBe(100)
  })

  it("applies the configured severity penalty", () => {
    expect(
      calculateCategoryScore(
        makeResult("Security", [
          {
            id: "test-high",
            category: "Security",
            severity: "high",
            title: "High severity finding",
            description: "A test finding.",
          },
        ])
      )
    ).toBe(85)
  })

  it("does not penalize known overlapping findings twice", () => {
    expect(
      calculateCategoryScore(
        makeResult("Maintainability", [
          {
            id: "maintainability-no-recognized-tests",
            category: "Maintainability",
            severity: "medium",
            title: "No recognized tests",
            description: "Testing owns this signal.",
          },
        ])
      )
    ).toBe(100)
  })

  it("never returns a score below zero", () => {
    expect(
      calculateCategoryScore(
        makeResult(
          "Security",
          Array.from({ length: 10 }, (_, index) => ({
            id: `critical-${index}`,
            category: "Security",
            severity: "critical" as const,
            title: "Critical finding",
            description: "A test finding.",
          }))
        )
      )
    ).toBe(0)
  })
})

describe("calculateRepositoryScore", () => {
  it("returns 100 for a complete analysis with no findings", () => {
    const result = calculateRepositoryScore(
      makeCompleteResults()
    )

    expect(result.score).toBe(100)
    expect(result.rating).toBe("Excellent")
    expect(result.coveragePercent).toBe(100)
    expect(result.missingCategories).toEqual([])
  })

  it("returns no overall score when a category is missing", () => {
    const result = calculateRepositoryScore(
      makeCompleteResults().filter(
        (item) => item.category !== "Security"
      )
    )

    expect(result.score).toBeNull()
    expect(result.rating).toBeNull()
    expect(result.coveragePercent).toBe(85)
    expect(result.missingCategories).toContain("Security")
  })

  it("averages duplicate analyzer results for the same category", () => {
    const results = [
      ...makeCompleteResults(),
      makeResult("Testing", [
        {
          id: "test-medium",
          category: "Testing",
          severity: "medium",
          title: "Medium finding",
          description: "A test finding.",
        },
      ]),
    ]

    const result = calculateRepositoryScore(results)

    const testing = result.categories.find(
      (item) => item.category === "Testing"
    )

    expect(testing?.score).toBe(96)
  })

  it("does not include Code Statistics in weighted categories", () => {
    const results = [
      ...makeCompleteResults(),
      makeResult("Code Statistics", [
        {
          id: "stats-info",
          category: "Code Statistics",
          severity: "info",
          title: "Statistics context",
          description: "Not a weighted category.",
        },
      ]),
    ]

    const result = calculateRepositoryScore(results)

    expect(result.score).toBe(100)

    expect(
      result.categories.some(
        (item) =>
          (item.category as string) === "Code Statistics"
      )
    ).toBe(false)
  })
})