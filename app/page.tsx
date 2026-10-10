
"use client"

import { useState } from "react"
import Link from "next/link"

import { parseRepositoryUrl } from "@/lib/github/parse-repository-url"

type Severity = "critical" | "high" | "medium" | "low" | "info"

type Finding = {
  id: string
  category: string
  severity: Severity
  title: string
  description: string
  file?: string
  line?: number
  confidence?: number
  recommendation?: string
}

type AnalysisResult = {
  analyzer: string
  category: string
  score: number
  findings: Finding[]
  metrics: Record<string, number | string | boolean>
  recommendations: string[]
}

type CategoryScore = {
  category: string
  weight: number
  score: number
  weightedContribution: number
}

type RepositoryScore = {
  score: number | null
  rating: string | null
  coveragePercent: number
  categories: CategoryScore[]
  missingCategories: string[]
}

type Repository = {
  owner: string
  name: string
  description?: string | null
  stars?: number
  forks?: number
  issues?: number
  watchers?: number
  language?: string | null
  defaultBranch?: string
  license?: string | null
  archived?: boolean
  fork?: boolean
  updatedAt?: string | null
  pushedAt?: string | null
}

type RepositoryTree = {
  files?: unknown[]
  analysisFiles?: unknown[]
  analysisLimited?: boolean
  analysisExcludedFileCount?: number
  analysisExcludedByFileCount?: number
  analysisExcludedBySize?: number
  truncated?: boolean
}

type RepositoryReport = {
  repository: Repository
  tree: RepositoryTree
  analysis: Record<string, AnalysisResult>
  score: RepositoryScore
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Documentation: "Project documentation and onboarding",
  "Code Structure": "Organization and source file structure",
  Testing: "Test presence and testing configuration",
  Security: "Potentially sensitive files and security practices",
  Maintainability: "Codebase complexity and maintenance signals",
  Activity: "Repository freshness and project activity",
  "GitHub Practices": "Workflows and repository governance",
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  low: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  info: "border-border bg-muted text-muted-foreground",
}

const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
]

function formatNumber(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—"
  }

  return new Intl.NumberFormat("en-US").format(value)
}

function formatMetric(value: number | string | boolean): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (typeof value === "number") {
    return formatNumber(value)
  }

  return value
}

function formatDate(value?: string | null): string {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date)
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400"
  if (score >= 60) return "text-amber-400"
  return "text-red-400"
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-400"
  if (score >= 60) return "bg-amber-400"
  return "bg-red-400"
}

function getAllFindings(
  analysis: Record<string, AnalysisResult>
): Finding[] {
  return Object.values(analysis).flatMap(
    (result) => result.findings ?? []
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="mb-7">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

function ScoreRing({
  score,
  rating,
}: {
  score: number
  rating: string
}) {
  const radius = 62
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40">
        <svg
          viewBox="0 0 160 160"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`Repository health score: ${score} out of 100`}
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-muted"
          />

          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className={getScoreColor(score)}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tracking-tighter tabular-nums">
            {score}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            OUT OF 100
          </span>
        </div>
      </div>

      <span
        className={`mt-3 rounded-full border px-3 py-1 text-sm font-medium ${getScoreColor(score)}`}
      >
        {rating}
      </span>
    </div>
  )
}

function CategoryCard({ item }: { item: CategoryScore }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{item.category}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {CATEGORY_DESCRIPTIONS[item.category] ??
              "Repository health measurement"}
          </p>
        </div>

        <span
          className={`text-2xl font-semibold tabular-nums ${getScoreColor(item.score)}`}
        >
          {item.score}
        </span>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${getScoreBarColor(item.score)}`}
          style={{
            width: `${Math.max(0, Math.min(100, item.score))}%`,
          }}
        />
      </div>

      <div className="mt-3 flex justify-between gap-3 text-xs text-muted-foreground">
        <span>{item.weight}% weight</span>
        <span>
          {item.weightedContribution.toFixed(1)} points contributed
        </span>
      </div>
    </div>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_STYLES[finding.severity]}`}
        >
          {finding.severity}
        </span>

        <span className="text-xs text-muted-foreground">
          {finding.category}
        </span>
      </div>

      <h3 className="mt-3 font-medium leading-6">
        {finding.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {finding.description}
      </p>

      {finding.file && (
        <div className="mt-4 overflow-x-auto rounded-lg bg-muted/60 px-3 py-2">
          <code className="text-xs">
            {finding.file}
            {finding.line !== undefined && `:${finding.line}`}
          </code>
        </div>
      )}

      {finding.recommendation && (
        <div className="mt-4 border-l-2 border-foreground/30 pl-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended action
          </p>
          <p className="mt-1 text-sm leading-6">
            {finding.recommendation}
          </p>
        </div>
      )}
    </article>
  )
}

function MetricGrid({ result }: { result: AnalysisResult }) {
  const entries = Object.entries(result.metrics ?? {})

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No metrics reported by this analyzer.
      </p>
    )
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="min-w-0 rounded-lg border bg-background p-4"
        >
          <dt className="break-words text-xs text-muted-foreground">
            {key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ")}
          </dt>
          <dd className="mt-2 break-words text-sm font-medium">
            {formatMetric(value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function Home() {
  const [repositoryUrl, setRepositoryUrl] = useState("")
  const [error, setError] = useState("")
  const [report, setReport] = useState<RepositoryReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  async function handleAnalyze() {
    const parsed = parseRepositoryUrl(repositoryUrl)

    if (!parsed) {
      setReport(null)
      setError("Enter a valid public GitHub repository URL.")
      return
    }

    setError("")
    setReport(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/repository", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: repositoryUrl.trim(),
        }),
      })

      const data: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Unable to analyze this repository."

        throw new Error(message)
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("repository" in data) ||
        !("analysis" in data) ||
        !("score" in data)
      ) {
        throw new Error("The analysis API returned an unexpected response.")
      }

      setReport(data as RepositoryReport)

      window.setTimeout(() => {
        document
          .getElementById("report")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while analyzing the repository."
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter" && !isLoading) {
      void handleAnalyze()
    }
  }

  const allFindings = report ? getAllFindings(report.analysis) : []

  const filteredFindings =
    activeTab === "all"
      ? allFindings
      : allFindings.filter(
          (finding) => finding.severity === activeTab
        )

  const counts = SEVERITY_ORDER.reduce(
    (result, severity) => {
      result[severity] = allFindings.filter(
        (finding) => finding.severity === severity
      ).length
      return result
    },
    {} as Record<Severity, number>
  )

  const weightedResults = report?.score.categories ?? []

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-foreground/20 text-sm font-bold">
              R
            </div>

            <div>
              <span className="text-lg font-semibold tracking-tight">
                RepoLens
              </span>
              <span className="ml-3 hidden text-xs text-muted-foreground sm:inline">
                REPOSITORY INTELLIGENCE
              </span>
            </div>
          </Link>

          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-foreground/[0.04] blur-3xl" />
          <div className="absolute -bottom-52 left-1/4 h-96 w-96 rounded-full bg-foreground/[0.03] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-foreground" />
              <span className="text-xs font-semibold tracking-[0.22em] text-muted-foreground">
                GITHUB REPOSITORY HEALTH ANALYZER
              </span>
            </div>

            <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.06] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Understand your codebase.
              <span className="mt-2 block font-normal italic text-muted-foreground">
                Improve what matters.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Inspect repository health across structure, documentation,
              testing, security, maintainability, activity, and GitHub
              practices. Get a transparent score and actionable findings.
            </p>

            <div className="mt-10 max-w-3xl">
              <label
                htmlFor="repository-url"
                className="mb-3 block text-xs font-semibold tracking-wider text-muted-foreground"
              >
                PUBLIC GITHUB REPOSITORY
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="repository-url"
                  type="url"
                  value={repositoryUrl}
                  onChange={(event) => {
                    setRepositoryUrl(event.target.value)
                    setError("")
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="https://github.com/owner/repository"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "analysis-error" : undefined}
                  className="h-14 min-w-0 flex-1 rounded-lg border bg-card px-4 font-mono text-sm outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/70 focus:border-foreground/50"
                />

                <button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={isLoading}
                  className="flex h-14 items-center justify-center gap-3 rounded-lg bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      Analyze repository
                      <span aria-hidden="true">↗</span>
                    </>
                  )}
                </button>
              </div>

              {error && (
                <p
                  id="analysis-error"
                  role="alert"
                  className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400"
                >
                  {error}
                </p>
              )}

              {isLoading && (
                <div
                  role="status"
                  className="mt-5 rounded-lg border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-foreground" />
                    <p className="text-sm font-medium">
                      Inspecting repository…
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Retrieving GitHub metadata, inspecting eligible files,
                    and calculating category scores. Large repositories may
                    take longer.
                  </p>
                </div>
              )}

              {!error && !isLoading && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Public repositories only · Static analysis · No repository
                  code execution
                </p>
              )}
            </div>
          </div>

          <div className="mt-16 grid gap-5 border-t pt-6 sm:grid-cols-3">
            {[
              ["07", "Weighted health dimensions"],
              ["09", "Analysis outputs"],
              ["100%", "Transparent category weights"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-2xl font-semibold tracking-tight">
                  {value}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {report && (
        <section
          id="report"
          className="scroll-mt-6 border-b"
          aria-label="Repository analysis report"
        >
          <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
                  ANALYSIS REPORT
                </p>

                <h2 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                  {report.repository.owner}/{report.repository.name}
                </h2>

                {report.repository.description && (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {report.repository.description}
                  </p>
                )}

                <a
                  href={`https://github.com/${encodeURIComponent(report.repository.owner)}/${encodeURIComponent(report.repository.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                >
                  View on GitHub <span aria-hidden="true">↗</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReport(null)
                  setActiveTab("all")
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                className="self-start rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted sm:self-auto"
              >
                New analysis
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-8 sm:p-10">
                {report.score.score !== null &&
                report.score.rating !== null ? (
                  <ScoreRing
                    score={report.score.score}
                    rating={report.score.rating}
                  />
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-3xl font-semibold">Score unavailable</p>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                      Some weighted categories are missing. A complete
                      overall score is withheld.
                    </p>
                  </div>
                )}

                <div className="mt-8 grid w-full grid-cols-2 gap-3 border-t pt-6">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Score coverage
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {report.score.coveragePercent}%
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Findings detected
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatNumber(allFindings.length)}
                    </p>
                  </div>
                </div>

                {report.score.missingCategories.length > 0 && (
                  <p className="mt-4 w-full text-xs leading-5 text-amber-400">
                    Missing categories:{" "}
                    {report.score.missingCategories.join(", ")}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border bg-card p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Repository overview
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Retrieved from GitHub metadata
                    </p>
                  </div>

                  {report.repository.language && (
                    <span className="rounded-full border px-3 py-1 text-xs">
                      {report.repository.language}
                    </span>
                  )}
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6">
                  {[
                    ["Stars", formatNumber(report.repository.stars)],
                    ["Forks", formatNumber(report.repository.forks)],
                    ["Open issues", formatNumber(report.repository.issues)],
                    ["Watchers", formatNumber(report.repository.watchers)],
                    ["Default branch", report.repository.defaultBranch ?? "—"],
                    ["License", report.repository.license ?? "Not detected"],
                    ["Last pushed", formatDate(report.repository.pushedAt)],
                    ["Last updated", formatDate(report.repository.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="mt-1 break-words text-sm font-medium">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {(report.repository.archived || report.repository.fork) && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {report.repository.archived && (
                      <span className="rounded-full border px-3 py-1 text-xs">
                        Archived repository
                      </span>
                    )}
                    {report.repository.fork && (
                      <span className="rounded-full border px-3 py-1 text-xs">
                        Fork
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-14">
              <SectionHeading
                eyebrow="SCORING BREAKDOWN"
                title="Seven dimensions of health."
                description="Each category has an explicit weight. Dependency analysis and code statistics are reported separately and do not affect the overall score."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {weightedResults.map((item) => (
                  <CategoryCard key={item.category} item={item} />
                ))}
              </div>
            </div>

            <div className="mt-14">
              <SectionHeading
                eyebrow="FINDINGS"
                title="What needs attention?"
                description="Findings are generated by the static analyzers. Informational findings provide context and do not necessarily indicate a defect."
              />

              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  aria-pressed={activeTab === "all"}
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === "all"
                      ? "border-foreground bg-foreground text-background"
                      : "hover:bg-muted"
                  }`}
                >
                  All ({allFindings.length})
                </button>

                {SEVERITY_ORDER.map((severity) => (
                  <button
                    key={severity}
                    type="button"
                    onClick={() => setActiveTab(severity)}
                    aria-pressed={activeTab === severity}
                    className={`rounded-full border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      activeTab === severity
                        ? "border-foreground bg-foreground text-background"
                        : "hover:bg-muted"
                    }`}
                  >
                    {severity} ({counts[severity]})
                  </button>
                ))}
              </div>

              {filteredFindings.length === 0 ? (
                <div className="rounded-xl border bg-card px-6 py-12 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-lg">
                    ✓
                  </div>
                  <h3 className="mt-4 font-medium">
                    {allFindings.length === 0
                      ? "No findings were reported"
                      : `No ${activeTab} findings`}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    {allFindings.length === 0
                      ? "The analyzers did not report any findings for this repository. This does not guarantee the absence of defects or vulnerabilities."
                      : "Try another severity filter to see more findings."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredFindings.map((finding, index) => (
                    <FindingCard
                      key={`${finding.id}-${finding.file ?? ""}-${index}`}
                      finding={finding}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-14">
              <SectionHeading
                eyebrow="RECOMMENDATIONS"
                title="Next actions."
                description="Recommendations from each analyzer, grouped by analysis area."
              />

              <div className="grid gap-4 lg:grid-cols-2">
                {Object.entries(report.analysis)
                  .filter(([, result]) => result.recommendations?.length)
                  .map(([key, result]) => (
                    <div
                      key={key}
                      className="rounded-xl border bg-card p-5"
                    >
                      <h3 className="font-medium">{result.category}</h3>

                      <ul className="mt-4 space-y-3">
                        {result.recommendations.map(
                          (recommendation, index) => (
                            <li
                              key={`${key}-${index}`}
                              className="flex gap-3 text-sm leading-6 text-muted-foreground"
                            >
                              <span className="mt-0.5 text-foreground">
                                →
                              </span>
                              <span>{recommendation}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-14">
              <SectionHeading
                eyebrow="ANALYSIS DETAILS"
                title="Metrics and coverage."
                description="Inspect the metrics reported by each analyzer, including dependency analysis and code statistics."
              />

              <div className="space-y-4">
                {Object.entries(report.analysis).map(([key, result]) => (
                  <details
                    key={key}
                    className="group rounded-xl border bg-card"
                    open={key === "codeStatistics"}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
                      <div>
                        <h3 className="font-medium">{result.category}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {result.analyzer}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {result.findings.length} findings
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground transition-transform group-open:rotate-180"
                        >
                          ↓
                        </span>
                      </div>
                    </summary>

                    <div className="border-t p-5">
                      <MetricGrid result={result} />

                      {result.findings.length > 0 && (
                        <div className="mt-6">
                          <h4 className="mb-3 text-sm font-medium">
                            Findings in this analyzer
                          </h4>

                          <div className="space-y-3">
                            {result.findings.map((finding, index) => (
                              <FindingCard
                                key={`${finding.id}-${index}`}
                                finding={finding}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-xl border bg-muted/30 p-5">
              <h3 className="text-sm font-semibold">
                Analysis coverage and limitations
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                These results are based on static analysis and GitHub metadata.
                RepoLens does not execute repository code. File limits and
                excluded files may mean that not every repository file was
                inspected.
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Files in tree
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {formatNumber(report.tree.files?.length)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted-foreground">
                    Selected files
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {formatNumber(report.tree.analysisFiles?.length)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted-foreground">
                    Excluded files
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {formatNumber(report.tree.analysisExcludedFileCount)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted-foreground">
                    Analysis truncated
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {report.tree.truncated ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>

              {report.tree.analysisLimited && (
                <p className="mt-4 text-sm leading-6 text-amber-400">
                  Analysis was limited by configured safeguards. Interpret
                  findings in the context of the reported coverage.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section id="how-it-works" className="border-b">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHeading
            eyebrow="THE PROCESS"
            title="From repository to report."
            description="A predictable analysis pipeline, designed to explain what it finds and where coverage is limited."
          />

          <div className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Retrieve",
                description:
                  "Fetch public repository metadata and the Git tree through GitHub's API.",
              },
              {
                number: "02",
                title: "Inspect",
                description:
                  "Run deterministic analyzers against eligible files and repository metadata.",
              },
              {
                number: "03",
                title: "Prioritize",
                description:
                  "Review weighted category scores, findings, metrics, and suggested next actions.",
              },
            ].map((step) => (
              <article key={step.number} className="bg-background p-7 sm:p-8">
                <span className="text-xs font-semibold tracking-widest text-muted-foreground">
                  {step.number}
                </span>
                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>RepoLens — GitHub Repository Health Analyzer</p>
          <p>Static analysis · Transparent scoring · Developer focused</p>
        </div>
      </footer>
    </main>
  )
}
