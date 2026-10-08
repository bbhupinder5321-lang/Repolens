import type { Analyzer } from "@/lib/analyzer/analyzer"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type {
  AnalysisResult,
  Finding,
} from "@/lib/analyzer/types"

const DAYS_PER_MONTH = 30
const DAYS_PER_YEAR = 365

function parseDate(
  value: string | null
): Date | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function getDaysSince(
  value: string | null,
  now: Date
): number | null {
  const date = parseDate(value)

  if (!date) {
    return null
  }

  const milliseconds =
    now.getTime() - date.getTime()

  return Math.max(
    0,
    Math.floor(
      milliseconds / (1000 * 60 * 60 * 24)
    )
  )
}

function getRepositoryAgeDays(
  createdAt: string | null,
  now: Date
): number | null {
  return getDaysSince(createdAt, now)
}

function getActivityBand(
  daysSincePush: number | null
): string {
  if (daysSincePush === null) {
    return "unknown"
  }

  if (daysSincePush <= 30) {
    return "recent"
  }

  if (daysSincePush <= 90) {
    return "moderate"
  }

  if (daysSincePush <= 180) {
    return "stale"
  }

  if (daysSincePush <= 365) {
    return "inactive"
  }

  return "long-inactive"
}

export const activityAnalyzer: Analyzer = {
  name: "Activity Analyzer",
  category: "Activity",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const now = new Date()

    const {
      createdAt,
      updatedAt,
      pushedAt,
      openIssues,
      isArchived,
      isFork,
      stars,
      forks,
      watchers,
    } = context.repository

    const repositoryAgeDays =
      getRepositoryAgeDays(
        createdAt,
        now
      )

    const daysSinceUpdate =
      getDaysSince(updatedAt, now)

    const daysSincePush =
      getDaysSince(pushedAt, now)

    const activityBand =
      getActivityBand(daysSincePush)

    const findings: Finding[] = []

    if (isArchived) {
      findings.push({
        id: "activity-repository-archived",
        category: "Activity",
        severity: "high",
        title:
          "Repository is archived",
        description:
          "GitHub reports this repository as archived. Archived repositories are read-only and are generally no longer expected to receive active development.",
        confidence: 1,
        recommendation:
          "If continued development is expected, review the repository's archived status and document where active development should occur.",
      })
    }

    if (
      daysSincePush !== null &&
      daysSincePush > 365
    ) {
      findings.push({
        id: "activity-no-recent-push",
        category: "Activity",
        severity: "medium",
        title:
          "No push activity detected in the last year",
        description:
          `The repository's latest recorded push was ${daysSincePush} day(s) ago.`,
        confidence: 1,
        recommendation:
          "Review whether the current development cadence matches the project's intended maintenance expectations.",
      })
    } else if (
      daysSincePush !== null &&
      daysSincePush > 180
    ) {
      findings.push({
        id: "activity-low-recent-push-activity",
        category: "Activity",
        severity: "low",
        title:
          "Recent push activity is limited",
        description:
          `The repository's latest recorded push was ${daysSincePush} day(s) ago.`,
        confidence: 1,
        recommendation:
          "Review the project's development cadence and confirm that important maintenance work is still being tracked.",
      })
    }

    if (
      daysSinceUpdate !== null &&
      daysSinceUpdate > 365
    ) {
      findings.push({
        id: "activity-metadata-stale",
        category: "Activity",
        severity: "info",
        title:
          "Repository metadata has not changed recently",
        description:
          `GitHub reports the repository was last updated ${daysSinceUpdate} day(s) ago.`,
        confidence: 1,
        recommendation:
          "Review repository settings, issues, and project maintenance expectations if long periods without changes are unexpected.",
      })
    }

    if (
      repositoryAgeDays !== null &&
      repositoryAgeDays < 30 &&
      daysSincePush !== null
    ) {
      findings.push({
        id: "activity-new-repository",
        category: "Activity",
        severity: "info",
        title:
          "Repository is relatively new",
        description:
          `The repository was created approximately ${repositoryAgeDays} day(s) ago.`,
        confidence: 1,
        recommendation:
          "Treat activity metrics cautiously for newly created repositories because their development history is naturally limited.",
      })
    }

    if (
      isFork
    ) {
      findings.push({
        id: "activity-forked-repository",
        category: "Activity",
        severity: "info",
        title:
          "Repository is a fork",
        description:
          "GitHub reports this repository as a fork of another repository.",
        confidence: 1,
        recommendation:
          "Interpret activity in the context of the upstream project and the fork's own development goals.",
      })
    }

    const metrics = {
      repositoryAgeDays:
        repositoryAgeDays ?? -1,
      daysSinceUpdate:
        daysSinceUpdate ?? -1,
      daysSincePush:
        daysSincePush ?? -1,
      activityBand,
      isArchived,
      isFork,
      openIssues,
      stars,
      forks,
      watchers,
    }

    return {
      analyzer: "Activity Analyzer",
      category: "Activity",
      score: 0,
      findings,
      metrics,
      recommendations: [],
    }
  },
}