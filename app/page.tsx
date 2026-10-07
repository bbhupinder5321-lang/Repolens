import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">
              R
            </div>
            <span className="text-lg font-semibold tracking-tight">
              RepoLens
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#analysis" className="transition-colors hover:text-foreground">
              Analysis
            </a>
            <a href="#about" className="transition-colors hover:text-foreground">
              About
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-24 sm:pt-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              GitHub Repository Health Analyzer
            </div>

            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Know how healthy your
              <span className="block text-muted-foreground">
                repository really is.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              RepoLens analyzes documentation, structure, testing, security,
              maintainability, activity, and GitHub practices to produce a
              transparent developer-quality health report.
            </p>

            {/* Repository input */}
            <div className="mx-auto mt-10 max-w-2xl">
              <div className="flex flex-col gap-3 rounded-xl border bg-card p-2 shadow-sm sm:flex-row">
                <input
                  type="url"
                  placeholder="https://github.com/owner/repository"
                  className="h-12 min-w-0 flex-1 rounded-lg bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
                />

                <button
                  type="button"
                  className="h-12 rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  Analyze repository
                </button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Public GitHub repositories only · Static analysis · No code execution
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample report */}
      <section id="analysis" className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10">
            <p className="text-sm font-medium text-muted-foreground">
              SAMPLE ANALYSIS
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              A report built for developers.
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b px-6 py-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    facebook / react
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">
                    Repository Health
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-3xl font-bold">82</div>
                    <div className="text-xs text-muted-foreground">
                      out of 100
                    </div>
                  </div>

                  <div className="rounded-full border px-3 py-1 text-xs font-medium">
                    Healthy
                  </div>
                </div>
              </div>
            </div>

            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {[
                ["Documentation", "88"],
                ["Code Structure", "91"],
                ["Testing", "84"],
                ["Security", "79"],
              ].map(([name, score]) => (
                <div key={name} className="p-6">
                  <div className="text-sm text-muted-foreground">{name}</div>
                  <div className="mt-2 text-2xl font-semibold">{score}</div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-6">
              <div className="mb-4 text-sm font-medium">Top findings</div>

              <div className="space-y-3">
                {[
                  "Improve documentation around local development setup",
                  "Review several large source files for maintainability",
                  "Add stronger coverage visibility to CI",
                ].map((finding, index) => (
                  <div
                    key={finding}
                    className="flex items-start gap-3 rounded-lg border p-4"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>

                    <p className="text-sm text-muted-foreground">
                      {finding}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">
              HOW IT WORKS
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              From repository URL to actionable report.
            </h2>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Fetch",
                description:
                  "RepoLens retrieves public repository metadata and relevant files through GitHub's API.",
              },
              {
                number: "02",
                title: "Analyze",
                description:
                  "Independent analyzers inspect documentation, structure, testing, dependencies, security, and activity.",
              },
              {
                number: "03",
                title: "Explain",
                description:
                  "A weighted scoring system turns the findings into a transparent health score and prioritized recommendations.",
              },
            ].map((step) => (
              <div key={step.number} className="bg-background p-8">
                <div className="text-xs font-semibold text-muted-foreground">
                  {step.number}
                </div>

                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis categories */}
      <section id="about" className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">
              ANALYSIS ENGINE
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Seven dimensions of repository health.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Documentation",
              "Code Structure",
              "Testing",
              "Security",
              "Maintainability",
              "Activity",
              "GitHub Practices",
            ].map((category) => (
              <div
                key={category}
                className="rounded-xl border bg-card p-5"
              >
                <div className="h-2 w-2 rounded-full bg-foreground" />
                <h3 className="mt-4 font-medium">{category}</h3>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  Deterministic analysis with transparent findings and
                  recommendations.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>RepoLens — GitHub Repository Health Analyzer</p>
          <p>Static analysis · Transparent scoring · Developer focused</p>
        </div>
      </footer>
    </main>
  )
}