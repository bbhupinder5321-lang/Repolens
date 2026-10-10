import type { AnalysisResult } from "./types"

export const CATEGORY_WEIGHTS = {
  Documentation: 15,
  "Code Structure": 20,
  Testing: 15,
  Security: 15,
  Maintainability: 20,
  Activity: 10,
  "GitHub Practices": 5,
} as const

export type ScoredCategory =
  keyof typeof CATEGORY_WEIGHTS

export type HealthRating =
  | "Excellent"
  | "Healthy"
  | "Good"
  | "Needs Attention"
  | "Weak"
  | "Critical"

export interface CategoryScore {
  category: ScoredCategory
  weight: number
  score: number
  weightedContribution: number
}

export interface RepositoryScore {
  score: number | null
  rating: HealthRating | null
  coveragePercent: number
  categories: CategoryScore[]
  missingCategories: ScoredCategory[]
}

const SEVERITY_PENALTIES = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
} as const

const MAX_CATEGORY_PENALTY = 100

/**
 * Some findings overlap across analyzers.
 *
 * Each underlying concern should affect only its
 * designated scoring category. The findings remain
 * visible in the report even when their score penalty
 * is overridden.
 */
const FINDING_PENALTY_OVERRIDES: Record<
  string,
  number
> = {
  // Testing owns test-presence scoring.
  "maintainability-no-recognized-tests": 0,

  // Documentation owns documentation-presence scoring.
  "maintainability-no-documentation-files": 0,

  // Documentation owns security-policy presence.
  "security-no-security-policy": 0,

  // Code Structure owns large-source-file scoring.
  "maintainability-large-source-files": 0,
  "maintainability-very-large-source-files": 0,
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score))
}

export function getHealthRating(
  score: number
): HealthRating {
  if (score >= 90) return "Excellent"
  if (score >= 80) return "Healthy"
  if (score >= 70) return "Good"
  if (score >= 60) return "Needs Attention"
  if (score >= 40) return "Weak"

  return "Critical"
}

export function calculateCategoryScore(
  result: AnalysisResult
): number {
  const totalPenalty = result.findings.reduce(
    (total, finding) => {
      const override =
        FINDING_PENALTY_OVERRIDES[finding.id]

      const penalty =
        override ??
        SEVERITY_PENALTIES[finding.severity]

      return total + penalty
    },
    0
  )

  return clampScore(
    100 - Math.min(
      totalPenalty,
      MAX_CATEGORY_PENALTY
    )
  )
}

export function calculateRepositoryScore(
  results: AnalysisResult[]
): RepositoryScore {
  const categories: CategoryScore[] = []

  for (const [
    category,
    weight,
  ] of Object.entries(CATEGORY_WEIGHTS) as [
    ScoredCategory,
    number,
  ][]) {
    const matchingResults = results.filter(
      (result) => result.category === category
    )

    if (matchingResults.length === 0) {
      continue
    }

    const averageScore =
      matchingResults.reduce(
        (total, result) =>
          total + calculateCategoryScore(result),
        0
      ) / matchingResults.length

    const score = Math.round(
      clampScore(averageScore)
    )

    categories.push({
      category,
      weight,
      score,
      weightedContribution:
        (score * weight) / 100,
    })
  }

  const availableCategories = new Set(
    categories.map((category) => category.category)
  )

  const missingCategories =
    (
      Object.keys(
        CATEGORY_WEIGHTS
      ) as ScoredCategory[]
    ).filter(
      (category) =>
        !availableCategories.has(category)
    )

  const totalWeight = Object.values(
    CATEGORY_WEIGHTS
  ).reduce(
    (total, weight) => total + weight,
    0
  )

  const availableWeight = categories.reduce(
    (total, category) =>
      total + category.weight,
    0
  )

  const coveragePercent = Math.round(
    (availableWeight / totalWeight) * 100
  )

  // Never present a partial analysis as a complete score.
  if (missingCategories.length > 0) {
    return {
      score: null,
      rating: null,
      coveragePercent,
      categories,
      missingCategories,
    }
  }

  const weightedScore = categories.reduce(
    (total, category) =>
      total + category.weightedContribution,
    0
  )

  const score = Math.round(
    clampScore(weightedScore)
  )

  return {
    score,
    rating: getHealthRating(score),
    coveragePercent: 100,
    categories,
    missingCategories: [],
  }
}