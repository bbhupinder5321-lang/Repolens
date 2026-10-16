
import { NextResponse } from "next/server"

type Priority = "high" | "medium" | "low"
type EvidenceStatus = "matched" | "general"

type Finding = {
  category: string
  severity: string
  title: string
  description: string
  file: string
  recommendation: string
}

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function cleanText(value: unknown, maxLength = 1200): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function priority(value: unknown): Priority {
  return value === "high" || value === "low" ? value : "medium"
}

function normalizeTitle(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()

    if (!isRecord(body) || !isRecord(body.report)) {
      return NextResponse.json(
        { error: "A valid repository analysis report is required." },
        { status: 400 },
      )
    }

    const report = body.report

    if (!isRecord(report.repository) || !isRecord(report.analysis)) {
      return NextResponse.json(
        { error: "A valid repository analysis report is required." },
        { status: 400 },
      )
    }

    const repository = report.repository
    const analysis = report.analysis
    const score = isRecord(report.score) ? report.score : {}
    const categories = Array.isArray(score.categories) ? score.categories : []

    const findings: Finding[] = Object.values(analysis)
      .flatMap((item) =>
        isRecord(item) && Array.isArray(item.findings) ? item.findings : [],
      )
      .filter(isRecord)
      .slice(0, 80)
      .map((finding) => ({
        category: cleanText(finding.category, 100),
        severity: cleanText(finding.severity, 20),
        title: cleanText(finding.title, 200),
        description: cleanText(finding.description, 500),
        file: cleanText(finding.file, 240),
        recommendation: cleanText(finding.recommendation, 500),
      }))

    // Only these report findings can qualify as matched evidence.
    const findingsByTitle = new Map<string, Finding>()

    for (const finding of findings) {
      if (finding.title) {
        const key = normalizeTitle(finding.title)

        if (!findingsByTitle.has(key)) {
          findingsByTitle.set(key, finding)
        }
      }
    }

    function resolveEvidence(value: unknown): {
      evidenceStatus: EvidenceStatus
      evidenceTitle: string
      evidenceFile: string
    } {
      const requestedTitle = cleanText(value, 200)
      const matchedFinding = requestedTitle
        ? findingsByTitle.get(normalizeTitle(requestedTitle))
        : undefined

      if (!matchedFinding) {
        return {
          evidenceStatus: "general",
          evidenceTitle: "",
          evidenceFile: "",
        }
      }

      return {
        evidenceStatus: "matched",
        evidenceTitle: matchedFinding.title,
        evidenceFile: matchedFinding.file,
      }
    }

    const analyzerRecommendations = Object.values(analysis)
      .flatMap((item) =>
        isRecord(item) && Array.isArray(item.recommendations)
          ? item.recommendations.filter(
              (entry): entry is string => typeof entry === "string",
            )
          : [],
      )
      .slice(0, 40)

    const context = {
      repository: {
        owner: cleanText(repository.owner, 100),
        name: cleanText(repository.name, 100),
        description: cleanText(repository.description, 300),
        language: cleanText(repository.language, 100),
      },
      overallScore: typeof score.score === "number" ? score.score : null,
      rating: cleanText(score.rating, 50),
      coveragePercent:
        typeof score.coveragePercent === "number"
          ? score.coveragePercent
          : null,
      categories,
      findings,
      analyzerRecommendations,
    }

    const baseUrl = (
      process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"
    ).replace(/\/$/, "")
    const model = process.env.OLLAMA_MODEL || "llama3.2"

    const prompt = [
      "You are RepoLens, a careful repository quality advisor.",
      "Use only the supplied static-analysis report.",
      "Do not claim to have inspected source code beyond the supplied findings.",
      "Prioritize concrete, verifiable improvements. Do not invent vulnerabilities or facts.",
      "For every insight and task, set evidenceTitle to the exact title of one supplied finding when it directly supports the recommendation.",
      "If no supplied finding directly supports the insight or task, set evidenceTitle to an empty string.",
      "Never invent, paraphrase, or modify a finding title in evidenceTitle.",
      "relatedFinding must also be either an exact supplied finding title or an empty string.",
      "Return JSON only with this shape:",
      '{"summary":"string","insights":[{"title":"string","detail":"string","priority":"high|medium|low","evidenceTitle":"exact finding title or empty string"}],"tasks":[{"title":"string","description":"string","priority":"high|medium|low","relatedFinding":"exact finding title or empty string","evidenceTitle":"exact finding title or empty string"}]}',
      "Include 2-5 insights and 3-8 actionable tasks.",
      "Order tasks by priority, then expected impact.",
      "Keep each task small enough to complete independently.",
      "Report context:",
      JSON.stringify(context),
    ].join("\n\n")

    let ollamaResponse: Response

    try {
      ollamaResponse = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: "json",
        }),
        signal: AbortSignal.timeout(90_000),
        cache: "no-store",
      })
    } catch {
      return NextResponse.json(
        {
          error:
            "The local AI model is not reachable. Start Ollama, download a model (for example: ollama pull llama3.2), then try again.",
          provider: "ollama",
          model,
        },
        { status: 503 },
      )
    }

    if (!ollamaResponse.ok) {
      return NextResponse.json(
        {
          error:
            ollamaResponse.status === 404
              ? `Ollama could not find the configured model. Run ollama pull ${model} or set OLLAMA_MODEL.`
              : "Ollama returned an error. Check that the local service and model are running.",
          provider: "ollama",
          model,
        },
        { status: 502 },
      )
    }

    const ollamaData: unknown = await ollamaResponse.json()
    const raw = isRecord(ollamaData)
      ? cleanText(ollamaData.response, 20_000)
      : ""

    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        {
          error: "The local model returned an unreadable response. Please try again.",
        },
        { status: 502 },
      )
    }

    if (!isRecord(parsed)) {
      return NextResponse.json(
        { error: "The local model returned an unexpected response." },
        { status: 502 },
      )
    }

    const insights = Array.isArray(parsed.insights)
      ? parsed.insights
          .filter(isRecord)
          .slice(0, 5)
          .map((item) => {
            const evidence = resolveEvidence(item.evidenceTitle)

            return {
              title: cleanText(item.title, 180),
              detail: cleanText(item.detail, 1000),
              priority: priority(item.priority),
              ...evidence,
            }
          })
          .filter((item) => item.title && item.detail)
          .sort(
            (a, b) =>
              PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
          )
      : []

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter(isRecord)
          .slice(0, 8)
          .map((item) => {
            // Use the server-validated evidence title, not the model's claim.
            const evidence = resolveEvidence(item.evidenceTitle)

            return {
              id: crypto.randomUUID(),
              title: cleanText(item.title, 180),
              description: cleanText(item.description, 800),
              priority: priority(item.priority),
              relatedFinding: evidence.evidenceTitle,
              ...evidence,
            }
          })
          .filter((item) => item.title && item.description)
          .sort(
            (a, b) =>
              PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
          )
      : []

    return NextResponse.json({
      provider: "ollama",
      model,
      summary: cleanText(parsed.summary, 1600),
      insights,
      tasks,
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to generate local AI insights from this report." },
      { status: 400 },
    )
  }
}
