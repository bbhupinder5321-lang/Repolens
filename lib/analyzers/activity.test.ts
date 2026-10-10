import { afterEach, describe, expect, it, vi } from "vitest"
import { activityAnalyzer } from "./activity"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type { RepositoryMetadata } from "@/lib/github/repository"
import type { RepositoryTree } from "@/lib/github/tree"

const FIXED_NOW = new Date("2026-10-10T12:00:00.000Z")

function daysAgo(days: number): string {
  return new Date(
    FIXED_NOW.getTime() - days * 24 * 60 * 60 * 1000
  ).toISOString()
}

function createContext(
  overrides: Partial<RepositoryMetadata> = {}
): AnalyzerContext {
  const repository: RepositoryMetadata = {
    requestedOwner: "test-owner",
    requestedName: "test-repo",
    owner: "test-owner",
    name: "test-repo",
    fullName: "test-owner/test-repo",
    description: "Test repository",
    htmlUrl: "https://github.com/test-owner/test-repo",
    defaultBranch: "main",
    stars: 10,
    forks: 2,
    openIssues: 1,
    watchers: 5,
    language: "TypeScript",
    sizeKb: 100,
    isPrivate: false,
    isArchived: false,
    isFork: false,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(2),
    pushedAt: daysAgo(1),
    license: "MIT",
    topics: [],
    ...overrides,
  }

  const tree: RepositoryTree = {
    branch: "main",
    files: [],
    analysisFiles: [],
    analysisLimited: false,
    analysisExcludedFileCount: 0,
    analysisExcludedByFileCount: 0,
    analysisExcludedBySize: 0,
    truncated: false,
  }

  return { repository, tree }
}

async function analyze(
  overrides: Partial<RepositoryMetadata> = {}
) {
  return activityAnalyzer.analyze(createContext(overrides))
}

describe("Activity Analyzer", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("reports recent activity for a push within 30 days", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = await analyze({ pushedAt: daysAgo(30) })

    expect(result.metrics.daysSincePush).toBe(30)
    expect(result.metrics.activityBand).toBe("recent")
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "activity-low-recent-push-activity",
      })
    )
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "activity-no-recent-push",
      })
    )
  })

  it("classifies pushes between 31 and 90 days as moderate", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = await analyze({ pushedAt: daysAgo(31) })

    expect(result.metrics.daysSincePush).toBe(31)
    expect(result.metrics.activityBand).toBe("moderate")
  })

  it("classifies pushes between 91 and 180 days as stale", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = await analyze({ pushedAt: daysAgo(91) })

    expect(result.metrics.daysSincePush).toBe(91)
    expect(result.metrics.activityBand).toBe("stale")
  })

  it("reports limited push activity after 180 days", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = await analyze({ pushedAt: daysAgo(181) })

    expect(result.metrics.activityBand).toBe("inactive")
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "activity-low-recent-push-activity",
        severity: "low",
      })
    )
  })

  it("reports no recent push activity after 365 days", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = await analyze({ pushedAt: daysAgo(366) })

    expect(result.metrics.activityBand).toBe("long-inactive")
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "activity-no-recent-push",
        severity: "medium",
      })
    )
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "activity-low-recent-push-activity",
      })
    )
  })

  it("does not flag missing or invalid push dates as stale", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    for (const pushedAt of [null, "not-a-date"]) {
      const result = await analyze({ pushedAt })

      expect(result.metrics.daysSincePush).toBe(-1)
      expect(result.metrics.activityBand).toBe("unknown")
      expect(result.findings).not.toContainEqual(
        expect.objectContaining({
          id: "activity-low-recent-push-activity",
        })
      )
      expect(result.findings).not.toContainEqual(
        expect.objectContaining({
          id: "activity-no-recent-push",
        })
      )
    }
  })

  it("does not report negative days for future timestamps", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const futureDate = new Date(
      FIXED_NOW.getTime() + 10 * 24 * 60 * 60 * 1000
    ).toISOString()

    const result = await analyze({ pushedAt: futureDate })

    expect(result.metrics.daysSincePush).toBe(0)
    expect(result.metrics.activityBand).toBe("recent")
  })

  it("reports archived repositories with a high-severity finding", async () => {
    const result = await analyze({ isArchived: true })

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "activity-repository-archived",
        severity: "high",
      })
    )
    expect(result.metrics.isArchived).toBe(true)
  })

  it("reports forks as informational findings", async () => {
    const result = await analyze({ isFork: true })

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "activity-forked-repository",
        severity: "info",
      })
    )
    expect(result.metrics.isFork).toBe(true)
  })

  it("reports recently created repositories when push dates are available", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = await analyze({
      createdAt: daysAgo(10),
      pushedAt: daysAgo(1),
    })

    expect(result.metrics.repositoryAgeDays).toBe(10)
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "activity-new-repository",
        severity: "info",
      })
    )
  })

  it("uses -1 metrics and unknown activity when dates are missing", async () => {
    const result = await analyze({
      createdAt: null,
      updatedAt: null,
      pushedAt: null,
    })

    expect(result.metrics.repositoryAgeDays).toBe(-1)
    expect(result.metrics.daysSinceUpdate).toBe(-1)
    expect(result.metrics.daysSincePush).toBe(-1)
    expect(result.metrics.activityBand).toBe("unknown")
  })

  it("returns the expected analyzer identity and result structure", async () => {
    const result = await analyze()

    expect(result.analyzer).toBe("Activity Analyzer")
    expect(result.category).toBe("Activity")
    expect(result.score).toBe(0)
    expect(Array.isArray(result.findings)).toBe(true)
    expect(Array.isArray(result.recommendations)).toBe(true)
    expect(result.recommendations).toEqual([])
  })
})