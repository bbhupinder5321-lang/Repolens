
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Code2,
  Copy,
  Database,
  ExternalLink,
  FileCode2,
  FileSearch,
  GitBranch,
  HeartPulse,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  TestTube2,
  TrendingUp,
  X,
  Zap,
  Sparkles,
  AlertCircle,
  BrainCircuit,
} from "lucide-react";
import { parseRepositoryUrl } from "@/lib/github/parse-repository-url";

type Severity = "critical" | "high" | "medium" | "low" | "info";

type Finding = {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  file?: string;
  line?: number;
  confidence?: number;
  recommendation?: string;
};

type AnalysisResult = {
  analyzer: string;
  category: string;
  score: number;
  findings: Finding[];
  metrics: Record<string, number | string | boolean>;
  recommendations: string[];
};

type CategoryScore = {
  category: string;
  weight: number;
  score: number;
  weightedContribution: number;
};

type RepositoryScore = {
  score: number | null;
  rating: string | null;
  coveragePercent: number;
  categories: CategoryScore[];
  missingCategories: string[];
};

type Repository = {
  owner: string;
  name: string;
  description?: string | null;
  stars?: number;
  forks?: number;
  issues?: number;
  watchers?: number;
  language?: string | null;
  defaultBranch?: string;
  license?: string | null;
  archived?: boolean;
  fork?: boolean;
  updatedAt?: string | null;
  pushedAt?: string | null;
};

type RepositoryTree = {
  files?: unknown[];
  analysisFiles?: unknown[];
  analysisLimited?: boolean;
  analysisExcludedFileCount?: number;
  analysisExcludedByFileCount?: number;
  analysisExcludedBySize?: number;
  truncated?: boolean;
};

type RepositoryReport = {
  repository: Repository;
  tree: RepositoryTree;
  analysis: Record<string, AnalysisResult>;
  score: RepositoryScore;
};

type AiPriority = "high" | "medium" | "low";

type AiEvidenceStatus = "matched" | "general";

type AiInsight = {
  title: string;
  detail: string;
  priority: AiPriority;
  evidenceStatus: AiEvidenceStatus;
  evidenceTitle: string;
  evidenceFile: string;
};

type AiTask = {
  id: string;
  title: string;
  description: string;
  priority: AiPriority;
  relatedFinding: string;
  evidenceStatus: AiEvidenceStatus;
  evidenceTitle: string;
  evidenceFile: string;
};

type AiResult = {
  provider: string;
  model: string;
  summary: string;
  insights: AiInsight[];
  tasks: AiTask[];
};

const EXAMPLES = [
  { label: "Next.js", url: "https://github.com/vercel/next.js" },
  { label: "React", url: "https://github.com/facebook/react" },
  { label: "Tailwind", url: "https://github.com/tailwindlabs/tailwindcss" },
];

const SEVERITIES: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  Documentation: BookOpen,
  "Code Structure": Layers3,
  Testing: TestTube2,
  Security: ShieldCheck,
  Maintainability: Code2,
  Activity,
  "Git Practices": GitBranch,
  Dependencies: Database,
  "Code Statistics": FileCode2,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Documentation: "Guides, project context and onboarding",
  "Code Structure": "Source organization and file structure",
  Testing: "Test presence and testing configuration",
  Security: "Potentially sensitive files and security practices",
  Maintainability: "Complexity and maintenance signals",
  Activity: "Repository freshness and project activity",
  "Git Practices": "Workflows and repository governance",
};

const SEVERITY_STYLE: Record<Severity, string> = {
  critical: "severity-critical",
  high: "severity-high",
  medium: "severity-medium",
  low: "severity-low",
  info: "severity-info",
};

const SCAN_STAGES = [
  "Connecting to repository",
  "Retrieving Git metadata",
  "Inspecting eligible files",
  "Evaluating health dimensions",
  "Preparing your report",
];

function formatNumber(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMetric(value: number | string | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return formatNumber(value);
  return value;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date);
}

function getScoreTone(score: number): string {
  if (score >= 80) return "score-good";
  if (score >= 60) return "score-warning";
  return "score-danger";
}

function getAllFindings(
  analysis: Record<string, AnalysisResult>,
): Finding[] {
  return Object.values(analysis).flatMap(
    (result) => result.findings ?? [],
  );
}

function ScoreRing({
  score,
  rating,
}: {
  score: number;
  rating: string;
}) {
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const progress =
    (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="score-ring-wrap">
      <div className="score-ring-glow" />
      <svg
        viewBox="0 0 160 160"
        className="score-ring"
        role="img"
        aria-label={`Repository health score: ${score} out of 100`}
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="score-track"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className={`score-progress ${getScoreTone(score)}`}
        />
      </svg>

      <div className="score-ring-value">
        <span className={`score-number ${getScoreTone(score)}`}>{score}</span>
        <span className="score-out-of">OUT OF 100</span>
      </div>

      <span className={`rating-pill ${getScoreTone(score)}`}>
        <span className="status-dot" />
        {rating}
      </span>
    </div>
  );
}

function CategoryCard({ item }: { item: CategoryScore }) {
  const Icon = CATEGORY_ICONS[item.category] ?? Layers3;

  return (
    <article className="category-card interactive-card">
      <div className="category-card-top">
        <div className="category-icon">
          <Icon size={18} strokeWidth={1.7} />
        </div>
        <span className={`category-score ${getScoreTone(item.score)}`}>
          {item.score}
          <span className="score-denominator">/100</span>
        </span>
      </div>

      <h3 className="category-title">{item.category}</h3>
      <p className="category-description">
        {CATEGORY_DESCRIPTIONS[item.category] ??
          "Repository health measurement"}
      </p>

      <div
        className="meter-track"
        role="progressbar"
        aria-label={`${item.category} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={item.score}
      >
        <div
          className={`meter-fill ${getScoreTone(item.score)}`}
          style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
        />
      </div>

      <div className="category-meta">
        <span>{item.weight}% weight</span>
        <span>{item.weightedContribution.toFixed(1)} points</span>
      </div>
    </article>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);

  const Icon =
    finding.severity === "critical" || finding.severity === "high"
      ? CircleAlert
      : finding.severity === "info"
        ? Activity
        : Check;

  return (
    <article className="finding-card interactive-card">
      <div className="finding-topline">
        <span className={`severity-pill ${SEVERITY_STYLE[finding.severity]}`}>
          <Icon size={12} />
          {finding.severity}
        </span>
        <span className="finding-category">{finding.category}</span>
        {typeof finding.confidence === "number" && (
          <span className="finding-confidence">
            {Math.round(finding.confidence <= 1 ? finding.confidence * 100 : finding.confidence)}% confidence
          </span>
        )}
      </div>

      <h3 className="finding-title">{finding.title}</h3>
      <p className="finding-description">{finding.description}</p>

      {finding.file && (
        <div className="file-reference">
          <FileCode2 size={14} />
          <code>
            {finding.file}
            {finding.line !== undefined ? `:${finding.line}` : ""}
          </code>
        </div>
      )}

      {finding.recommendation && (
        <div className="finding-recommendation">
          <div className="recommendation-heading">
            <Zap size={13} />
            Recommended action
          </div>
          <p>{finding.recommendation}</p>
        </div>
      )}

      <button
        type="button"
        className="finding-expand"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {expanded ? "Less detail" : "Finding details"}
        <ChevronDown
          size={14}
          className={expanded ? "rotate-icon" : ""}
        />
      </button>

      {expanded && (
        <div className="finding-extra">
          <div>
            <span>Finding ID</span>
            <code>{finding.id}</code>
          </div>
          <div>
            <span>Category</span>
            <span>{finding.category}</span>
          </div>
          <div>
            <span>Severity</span>
            <span className="capitalize">{finding.severity}</span>
          </div>
        </div>
      )}
    </article>
  );
}

function MetricGrid({ result }: { result: AnalysisResult }) {
  const entries = Object.entries(result.metrics ?? {});

  if (entries.length === 0) {
    return <p className="muted-text">No metrics reported by this analyzer.</p>;
  }

  return (
    <dl className="metrics-grid">
      {entries.map(([key, value]) => (
        <div className="metric-cell" key={key}>
          <dt>
            {key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ")}
          </dt>
          <dd>{formatMetric(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionTitle({
  index,
  eyebrow,
  title,
  description,
  action,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="section-heading-main">
        <div className="section-index">{index}</div>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="section-title">{title}</h2>
          {description && (
            <p className="section-description">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<RepositoryReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSeverity, setActiveSeverity] = useState("all");
  const [scanStage, setScanStage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

const [aiResult, setAiResult] = useState<AiResult | null>(null);
const [isAiLoading, setIsAiLoading] = useState(false);
const [aiError, setAiError] = useState("");
const [completedAiTasks, setCompletedAiTasks] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timer = window.setInterval(() => {
      setScanStage((stage) => (stage + 1) % SCAN_STAGES.length);
    }, 1500);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  const allFindings = useMemo(
    () => (report ? getAllFindings(report.analysis) : []),
    [report],
  );

  const filteredFindings = useMemo(
    () =>
      activeSeverity === "all"
        ? allFindings
        : allFindings.filter(
            (finding) => finding.severity === activeSeverity,
          ),
    [activeSeverity, allFindings],
  );

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    allFindings.forEach((finding) => {
      counts[finding.severity] += 1;
    });

    return counts;
  }, [allFindings]);

  const weightedResults = report?.score.categories ?? [];

  const repositoryLink = report
    ? `https://github.com/${encodeURIComponent(report.repository.owner)}/${encodeURIComponent(report.repository.name)}`
    : "";

  async function handleAiAnalysis() {
    if (!report) {
      setAiError("Analyze a repository first to generate AI insights.");
      return;
    }

    setIsAiLoading(true);
    setAiError("");
    setAiResult(null);
    setCompletedAiTasks([]);

    try {
      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ report }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Unable to generate AI insights.";

        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("summary" in data) ||
        typeof data.summary !== "string" ||
        !("insights" in data) ||
        !Array.isArray(data.insights) ||
        !("tasks" in data) ||
        !Array.isArray(data.tasks)
      ) {
        throw new Error("The AI service returned an unexpected response.");
      }

      setAiResult(data as AiResult);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating AI insights."
      );
    } finally {
      setIsAiLoading(false);
    }
  }

  const handleAnalyze = useCallback(async () => {
    const parsed = parseRepositoryUrl(repositoryUrl);

    if (!parsed) {
      setReport(null);
      setError("Enter a valid public GitHub repository URL.");
      return;
    }



    setError("");
    setReport(null);
    setActiveSeverity("all");
    setScanStage(0);
    setIsLoading(true);

    try {
      const response = await fetch("/api/repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repositoryUrl.trim() }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Unable to analyze this repository.";

        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("repository" in data) ||
        !("analysis" in data) ||
        !("score" in data)
      ) {
        throw new Error("The analysis API returned an unexpected response.");
      }

      setReport(data as RepositoryReport);

      window.setTimeout(() => {
        document.getElementById("report")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while analyzing the repository.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [repositoryUrl]);

  function handleInputKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter" && !isLoading) {
      void handleAnalyze();
    }
  }

  async function copyRepositoryLink() {
    if (!repositoryLink) return;

    try {
      await navigator.clipboard.writeText(repositoryLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy the link. You can copy it from the address bar.");
    }
  }

  function startNewAnalysis() {
    setReport(null);
    setError("");
    setActiveSeverity("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="forge-app">
      <style jsx global>{`

.ai-evidence-label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 12px;
  padding: 8px 10px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.09));
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
}

.ai-evidence-matched {
  color: #a7e4c0;
  background: rgba(52, 148, 95, 0.09);
  border-color: rgba(91, 190, 132, 0.24);
}

.ai-evidence-general {
  color: #c2c2c8;
  background: rgba(255, 255, 255, 0.025);
}

.ai-evidence-label code {
  max-width: 100%;
  overflow-wrap: anywhere;
  color: inherit;
  opacity: 0.85;
}


        :root {
          --forge-bg: #0b0c0d;
          --forge-panel: #111314;
          --forge-panel-2: #151718;
          --forge-border: rgba(255, 255, 255, 0.09);
          --forge-muted: #858987;
          --forge-text: #f2f1ed;
          --forge-orange: #ff7138;
          --forge-orange-soft: rgba(255, 113, 56, 0.12);
          --forge-green: #8cdaa5;
          --forge-yellow: #f5c66c;
          --forge-red: #ff8585;
        }

        .forge-app {
          min-height: 100vh;
          overflow: clip;
          background: var(--forge-bg);
          color: var(--forge-text);
          font-family: Arial, Helvetica, sans-serif;
          isolation: isolate;
        }

        .forge-app * {
          box-sizing: border-box;
        }

        .forge-app button,
        .forge-app input {
          font: inherit;
        }

        .forge-app button:focus-visible,
        .forge-app a:focus-visible,
        .forge-app input:focus-visible,
        .forge-app summary:focus-visible {
          outline: 2px solid var(--forge-orange);
          outline-offset: 4px;
        }

        .forge-app a {
          color: inherit;
          text-decoration: none;
        }

        .forge-app button {
          color: inherit;
        }

        .forge-app ::selection {
          background: rgba(255, 113, 56, 0.3);
          color: white;
        }

        .forge-shell {
          width: min(1320px, calc(100% - 64px));
          margin-inline: auto;
        }

        .forge-header {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid var(--forge-border);
          background: rgba(11, 12, 13, 0.84);
          backdrop-filter: blur(22px);
        }

        .forge-nav {
          display: flex;
          min-height: 72px;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .forge-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .forge-brand-mark {
          position: relative;
          display: grid;
          width: 39px;
          height: 39px;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(255, 113, 56, 0.55);
          background: linear-gradient(145deg, #302019, #141312 70%);
          color: var(--forge-orange);
          font-size: 18px;
          font-weight: 800;
          box-shadow: inset 0 0 18px rgba(255, 113, 56, 0.08);
        }

        .forge-brand-mark::after {
          position: absolute;
          top: -50%;
          left: -100%;
          width: 60%;
          height: 200%;
          background: linear-gradient(90deg, transparent, #ffffff22, transparent);
          content: "";
          transform: rotate(25deg);
          animation: forge-shimmer 5s ease-in-out infinite;
        }

        .forge-brand-name {
          font-size: 15px;
          font-weight: 750;
          letter-spacing: -0.04em;
        }

        .forge-brand-name span {
          color: var(--forge-orange);
        }

        .forge-brand-sub {
          margin-top: 4px;
          color: var(--forge-muted);
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.17em;
        }

        .forge-nav-links {
          display: flex;
          align-items: center;
          gap: 26px;
        }

        .forge-nav-links a {
          color: #a6aaa7;
          font-size: 12px;
          transition: color 180ms ease;
        }

        .forge-nav-links a:hover {
          color: white;
        }

        .engine-status {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 12px;
          border: 1px solid var(--forge-border);
          background: #ffffff03;
          color: #b9beb9;
          font-family: monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
        }

        .engine-light,
        .status-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: var(--forge-green);
          box-shadow: 0 0 12px #8cdaa566;
        }

        .engine-light {
          animation: forge-pulse 2.4s ease-in-out infinite;
        }

        .nav-menu-button {
          display: none;
          border: 1px solid var(--forge-border);
          background: transparent;
          padding: 9px;
          cursor: pointer;
        }

        .forge-hero {
          position: relative;
          border-bottom: 1px solid var(--forge-border);
          isolation: isolate;
        }

        .forge-hero::before {
          position: absolute;
          z-index: -1;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black 0%, transparent 85%);
          content: "";
          animation: forge-grid-drift 32s linear infinite;
        }

        .forge-hero::after {
          position: absolute;
          z-index: -1;
          top: -140px;
          left: 37%;
          width: 620px;
          height: 450px;
          border-radius: 50%;
          background: rgba(255, 94, 37, 0.09);
          filter: blur(120px);
          content: "";
          pointer-events: none;
        }

        .hero-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(370px, 0.8fr);
          align-items: center;
          gap: clamp(36px, 6vw, 88px);
          padding-block: clamp(68px, 9vw, 118px) 64px;
        }

        .hero-copy {
          animation: forge-enter 750ms cubic-bezier(.2,.75,.25,1) both;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          color: var(--forge-orange);
          font-family: monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.19em;
          text-transform: uppercase;
        }

        .eyebrow-line {
          width: 26px;
          height: 1px;
          background: var(--forge-orange);
        }

        .hero-title {
          max-width: 760px;
          margin: 25px 0 0;
          font-size: clamp(54px, 7.2vw, 100px);
          font-weight: 700;
          line-height: 0.91;
          letter-spacing: -0.085em;
        }

        .hero-title .muted-word {
          color: #858985;
        }

        .hero-title .ember-word {
          position: relative;
          display: inline-block;
          background: linear-gradient(100deg, #ff8a55 5%, #ffc09a 48%, #ff7138 82%);
          background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 180% 100%;
          animation: forge-gradient 7s ease-in-out infinite alternate;
        }

        .hero-description {
          max-width: 530px;
          margin-top: 27px;
          color: #a2a7a3;
          font-size: 15px;
          line-height: 1.95;
        }

        .hero-description strong {
          color: #e4e5e0;
          font-weight: 550;
        }

        .hero-points {
          display: flex;
          flex-wrap: wrap;
          gap: 11px 22px;
          margin-top: 30px;
        }

        .hero-point {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #b3b7b3;
          font-size: 11px;
        }

        .hero-point svg {
          color: var(--forge-orange);
        }

        .hero-number-row {
          display: flex;
          flex-wrap: wrap;
          gap: 32px;
          margin-top: 52px;
          padding-top: 23px;
          border-top: 1px solid var(--forge-border);
        }

        .hero-number {
          color: #f4f3ee;
          font-size: 24px;
          font-weight: 650;
          letter-spacing: -0.055em;
        }

        .hero-number span {
          color: var(--forge-orange);
        }

        .hero-number-label {
          margin-top: 6px;
          color: var(--forge-muted);
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
        }

        .terminal-card {
          position: relative;
          overflow: hidden;
          border: 1px solid #ffffff21;
          background: linear-gradient(155deg, #171818 0%, #101111 58%, #0e0f0f 100%);
          box-shadow: 0 28px 90px #0008, 0 0 70px #ff71380a;
          animation: forge-enter 900ms 120ms cubic-bezier(.2,.75,.25,1) both;
        }

        .terminal-card::before {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--forge-orange), #ffd0ad, transparent);
          content: "";
          opacity: 0.85;
        }

        .terminal-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 19px;
          border-bottom: 1px solid var(--forge-border);
          background: #ffffff03;
        }

        .terminal-lights {
          display: flex;
          gap: 6px;
        }

        .terminal-lights span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .terminal-lights span:nth-child(1) { background: #fb6e66; }
        .terminal-lights span:nth-child(2) { background: #e8b75e; }
        .terminal-lights span:nth-child(3) { background: #6ec98b; }

        .terminal-label {
          color: #777c78;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
        }

        .terminal-content {
          padding: clamp(22px, 3vw, 32px);
        }

        .terminal-index {
          color: var(--forge-orange);
          font-family: monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
        }

        .terminal-title {
          margin-top: 12px;
          color: #f3f2ee;
          font-size: 25px;
          font-weight: 650;
          letter-spacing: -0.055em;
        }

        .terminal-subtitle {
          margin-top: 8px;
          color: #939893;
          font-size: 12px;
          line-height: 1.8;
        }

        .input-label {
          display: block;
          margin-bottom: 9px;
          color: #a4a8a4;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
        }

        .repo-input-wrap {
          display: flex;
          min-height: 55px;
          align-items: center;
          gap: 11px;
          border: 1px solid #ffffff20;
          background: #080909;
          padding-inline: 14px;
          transition: border-color 180ms ease, box-shadow 180ms ease;
        }

        .repo-input-wrap:focus-within {
          border-color: var(--forge-orange);
          box-shadow: 0 0 0 3px #ff71381a, 0 0 25px #ff71380a;
        }

        .repo-input-wrap.has-error {
          border-color: #ff7474a0;
        }

        .repo-input-icon {
          flex: 0 0 auto;
          color: #858985;
        }

        .repo-input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          font-family: monospace !important;
          font-size: 12px !important;
        }

        .repo-input::placeholder {
          color: #5e625f;
        }

        .repo-input-clear {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          border: 0;
          background: transparent;
          padding: 6px;
          color: #888d89;
          cursor: pointer;
          transition: color 150ms ease;
        }

        .repo-input-clear:hover { color: white; }

        .analyze-button {
          position: relative;
          display: flex;
          width: 100%;
          min-height: 53px;
          align-items: center;
          justify-content: center;
          gap: 11px;
          overflow: hidden;
          margin-top: 12px;
          border: 1px solid #ff996f;
          background: var(--forge-orange);
          padding: 13px 18px;
          color: #160d08 !important;
          font-size: 12px !important;
          font-weight: 750 !important;
          cursor: pointer;
          transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }

        .analyze-button::before {
          position: absolute;
          top: 0;
          left: -120%;
          width: 80%;
          height: 100%;
          background: linear-gradient(90deg, transparent, #ffffff62, transparent);
          content: "";
          transform: skewX(-20deg);
          transition: left 550ms ease;
        }

        .analyze-button:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #ff8b5b;
          box-shadow: 0 9px 30px #ff71382c;
        }

        .analyze-button:hover::before { left: 140%; }

        .analyze-button:active:not(:disabled) {
          transform: translateY(0) scale(0.99);
        }

        .analyze-button:disabled {
          cursor: wait;
          opacity: 0.78;
        }

        .terminal-error {
          display: flex;
          gap: 9px;
          margin-top: 12px;
          border: 1px solid #ff74744d;
          background: #ff747410;
          padding: 12px;
          color: #ffb1b1;
          font-size: 12px;
          line-height: 1.6;
        }

        .examples {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          margin-top: 20px;
        }

        .examples-label {
          margin-right: 3px;
          color: #777c78;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
        }

        .example-chip {
          border: 1px solid #ffffff17;
          background: #ffffff04;
          padding: 6px 9px;
          color: #a9aeaa;
          font-size: 10px !important;
          cursor: pointer;
          transition: all 180ms ease;
        }

        .example-chip:hover {
          border-color: #ff71386b;
          background: var(--forge-orange-soft);
          color: #ffb28e;
        }

        .terminal-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 15px;
          margin-top: 21px;
          color: #777c78;
          font-size: 10px;
        }

        .terminal-trust span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .terminal-trust svg { color: #b6bbb6; }

        .terminal-bottom {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid var(--forge-border);
          background: #ffffff03;
        }

        .terminal-bottom-cell {
          padding: 14px 18px;
          border-right: 1px solid var(--forge-border);
        }

        .terminal-bottom-cell:last-child { border-right: 0; }

        .terminal-bottom-value {
          font-family: monospace;
          font-size: 12px;
          font-weight: 700;
        }

        .terminal-bottom-label {
          margin-top: 5px;
          color: #777c78;
          font-family: monospace;
          font-size: 8px;
          letter-spacing: 0.1em;
        }

        .scan-panel {
          margin-top: 20px;
          border: 1px solid #ff71384d;
          background: #ff713808;
          padding: 15px;
          animation: forge-enter 300ms ease both;
        }

        .scan-panel-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 600;
        }

        .scan-panel-heading svg { color: var(--forge-orange); }

        .scan-stage {
          margin-top: 8px;
          color: #a0a5a0;
          font-family: monospace;
          font-size: 10px;
        }

        .scan-progress {
          height: 3px;
          overflow: hidden;
          margin-top: 14px;
          background: #ffffff12;
        }

        .scan-progress-fill {
          height: 100%;
          width: 38%;
          background: var(--forge-orange);
          box-shadow: 0 0 12px #ff7138aa;
          animation: forge-scan 1.5s ease-in-out infinite;
        }

        .scan-stage-list {
          display: grid;
          gap: 9px;
          margin-top: 15px;
        }

        .scan-stage-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #858a86;
          font-family: monospace;
          font-size: 10px;
        }

        .scan-stage-item.active { color: #ffb18c; }

        .scan-stage-item svg { color: #6c716d; }
        .scan-stage-item.active svg { color: var(--forge-orange); }

        .hero-footnote {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding-block: 18px;
          border-top: 1px solid var(--forge-border);
          color: #777c78;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
        }

        .hero-footnote span { color: var(--forge-orange); }

        .report-section {
          scroll-margin-top: 95px;
          border-bottom: 1px solid var(--forge-border);
          animation: forge-enter 600ms ease both;
        }

        .report-content {
          padding-block: 60px 75px;
        }

        .report-top {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 30px;
        }

        .report-complete {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #8cdaa533;
          background: #8cdaa50b;
          padding: 8px 10px;
          color: var(--forge-green);
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
        }

        .report-title {
          margin-top: 17px;
          overflow-wrap: anywhere;
          font-size: clamp(28px, 4vw, 43px);
          font-weight: 650;
          letter-spacing: -0.065em;
        }

        .report-description {
          max-width: 680px;
          margin-top: 10px;
          color: #9da29e;
          font-size: 13px;
          line-height: 1.8;
        }

        .report-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .outline-button {
          display: inline-flex;
          min-height: 39px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--forge-border);
          background: #ffffff03;
          padding: 9px 13px;
          color: #c6cac6 !important;
          font-size: 11px !important;
          cursor: pointer;
          transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
        }

        .outline-button:hover {
          border-color: #ff713866;
          background: var(--forge-orange-soft);
          color: #ffb18c !important;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: minmax(270px, 0.8fr) minmax(0, 1.2fr);
          gap: 16px;
        }

        .forge-panel {
          min-width: 0;
          border: 1px solid var(--forge-border);
          background: linear-gradient(145deg, #151717, #101111 80%);
        }

        .panel-pad { padding: clamp(20px, 3vw, 32px); }

        .panel-kicker {
          color: var(--forge-orange);
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .panel-title {
          margin-top: 9px;
          font-size: 20px;
          font-weight: 650;
          letter-spacing: -0.045em;
        }

        .panel-subtitle {
          margin-top: 7px;
          color: #858a86;
          font-size: 11px;
          line-height: 1.7;
        }

        .score-panel {
          position: relative;
          overflow: hidden;
          display: flex;
          min-height: 440px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .score-panel::before {
          position: absolute;
          top: -120px;
          left: 50%;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: #ff71380a;
          filter: blur(45px);
          content: "";
        }

        .score-panel > * { position: relative; }

        .score-ring-wrap {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 14px;
        }

        .score-ring {
          width: 188px;
          height: 188px;
          overflow: visible;
          transform: rotate(-90deg);
        }

        .score-track { color: #ffffff12; }

        .score-progress {
          stroke-dashoffset: 0;
          animation: forge-score-draw 1.4s cubic-bezier(.2,.7,.2,1) both;
          filter: drop-shadow(0 0 7px currentColor);
        }

        .score-ring-glow {
          position: absolute;
          inset: 30px;
          border-radius: 50%;
          background: #ff71380c;
          filter: blur(28px);
          animation: forge-pulse 3s ease-in-out infinite;
        }

        .score-ring-value {
          position: absolute;
          top: 0;
          display: flex;
          width: 188px;
          height: 188px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .score-number {
          font-size: 65px;
          font-weight: 650;
          line-height: 1;
          letter-spacing: -0.09em;
          font-variant-numeric: tabular-nums;
        }

        .score-out-of {
          margin-top: 10px;
          color: #858a86;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
        }

        .score-good { color: var(--forge-green) !important; }
        .score-warning { color: var(--forge-yellow) !important; }
        .score-danger { color: var(--forge-red) !important; }

        .rating-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
          border: 1px solid currentColor;
          border-color: color-mix(in srgb, currentColor 28%, transparent);
          background: #ffffff04;
          padding: 8px 12px;
          font-size: 11px;
        }

        .rating-pill .status-dot {
          width: 6px;
          height: 6px;
          background: currentColor;
          box-shadow: none;
        }

        .score-summary {
          display: grid;
          width: 100%;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid var(--forge-border);
        }

        .score-summary-cell {
          border: 1px solid #ffffff0d;
          background: #00000020;
          padding: 15px;
        }

        .score-summary-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #939894;
          font-size: 10px;
        }

        .score-summary-value {
          margin-top: 9px;
          font-size: 25px;
          font-weight: 650;
          letter-spacing: -0.06em;
          font-variant-numeric: tabular-nums;
        }

        .profile-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .language-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #ff713844;
          background: var(--forge-orange-soft);
          padding: 8px 10px;
          color: #ffb18c;
          font-size: 10px;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 25px 18px;
          margin-top: 32px;
        }

        .profile-stat dt {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8e938f;
          font-size: 10px;
        }

        .profile-stat dt svg { color: #b1b5b1; }

        .profile-stat dd {
          margin-top: 9px;
          overflow-wrap: anywhere;
          color: #e9e9e4;
          font-size: 13px;
          font-weight: 550;
        }

        .category-section,
        .findings-section,
        .recommendations-section,
        .details-section {
          margin-top: 72px;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 25px;
        }

        .section-heading-main {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .section-index {
          display: grid;
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid #ff713844;
          background: var(--forge-orange-soft);
          color: var(--forge-orange);
          font-family: monospace;
          font-size: 10px;
        }

        .section-title {
          margin-top: 9px;
          font-size: clamp(23px, 3vw, 32px);
          font-weight: 650;
          letter-spacing: -0.06em;
        }

        .section-description {
          max-width: 690px;
          margin-top: 9px;
          color: #929792;
          font-size: 12px;
          line-height: 1.85;
        }

        .section-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--forge-border);
          padding: 9px 11px;
          color: #a7aca8;
          font-size: 10px;
          white-space: nowrap;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .interactive-card {
          position: relative;
          overflow: hidden;
          transition:
            transform 220ms cubic-bezier(.2,.7,.2,1),
            border-color 220ms ease,
            background 220ms ease,
            box-shadow 220ms ease;
        }

        .interactive-card::after {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, #ff71387c, transparent);
          content: "";
          opacity: 0;
          transition: opacity 220ms ease;
        }

        .interactive-card:hover {
          transform: translateY(-3px);
          border-color: #ff71384a;
          background-color: #191918;
          box-shadow: 0 16px 35px #0003;
        }

        .interactive-card:hover::after { opacity: 1; }

        .category-card {
          border: 1px solid var(--forge-border);
          background: linear-gradient(145deg, #151717, #111212);
          padding: 20px;
        }

        .category-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .category-icon {
          display: grid;
          width: 39px;
          height: 39px;
          place-items: center;
          border: 1px solid #ffffff14;
          background: #ffffff04;
          color: #b6bbb7;
          transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .category-card:hover .category-icon {
          border-color: #ff71384c;
          background: var(--forge-orange-soft);
          color: var(--forge-orange);
        }

        .category-score {
          font-size: 28px;
          font-weight: 650;
          letter-spacing: -0.07em;
          font-variant-numeric: tabular-nums;
        }

        .score-denominator {
          margin-left: 2px;
          color: #777c78;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0;
        }

        .category-title {
          margin-top: 21px;
          font-size: 14px;
          font-weight: 600;
        }

        .category-description {
          min-height: 34px;
          margin-top: 7px;
          color: #858a86;
          font-size: 10px;
          line-height: 1.7;
        }

        .meter-track {
          height: 4px;
          overflow: hidden;
          margin-top: 20px;
          background: #ffffff12;
        }

        .meter-fill {
          height: 100%;
          animation: forge-meter-enter 950ms cubic-bezier(.15,.7,.2,1) both;
        }

        .meter-fill.score-good { background: var(--forge-green); }
        .meter-fill.score-warning { background: var(--forge-yellow); }
        .meter-fill.score-danger { background: var(--forge-red); }

        .category-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
          color: #858a86;
          font-family: monospace;
          font-size: 9px;
        }

        .findings-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 17px;
        }

        .filter-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .filter-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid var(--forge-border);
          background: #ffffff03;
          padding: 9px 11px;
          color: #9da29e;
          font-size: 10px !important;
          cursor: pointer;
          transition: all 180ms ease;
        }

        .filter-button:hover {
          border-color: #ffffff28;
          color: white;
        }

        .filter-button.active {
          border-color: var(--forge-orange);
          background: var(--forge-orange);
          color: #160d08 !important;
          font-weight: 700 !important;
        }

        .filter-count {
          opacity: 0.75;
          font-family: monospace;
          font-size: 9px;
        }

        .findings-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .finding-card {
          border: 1px solid var(--forge-border);
          background: linear-gradient(145deg, #151717, #101111);
          padding: 19px;
        }

        .finding-topline {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .severity-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid currentColor;
          padding: 5px 7px;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .severity-critical { color: #ff8b8b; border-color: #ff8b8b38; background: #ff8b8b0b; }
        .severity-high { color: #ff9b67; border-color: #ff9b6738; background: #ff9b670b; }
        .severity-medium { color: #f4c66c; border-color: #f4c66c38; background: #f4c66c0b; }
        .severity-low { color: #8ecbff; border-color: #8ecbff38; background: #8ecbff0b; }
        .severity-info { color: #a7ada8; border-color: #ffffff1c; background: #ffffff05; }

        .finding-category {
          color: #969b97;
          font-size: 10px;
        }

        .finding-confidence {
          margin-left: auto;
          color: #858a86;
          font-family: monospace;
          font-size: 9px;
        }

        .finding-title {
          margin-top: 16px;
          font-size: 13px;
          font-weight: 650;
          line-height: 1.7;
        }

        .finding-description {
          margin-top: 7px;
          color: #969b97;
          font-size: 11px;
          line-height: 1.85;
        }

        .file-reference {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          margin-top: 14px;
          border: 1px solid #ffffff0c;
          background: #00000020;
          padding: 10px;
          color: var(--forge-orange);
        }

        .file-reference svg { flex: 0 0 auto; }

        .file-reference code {
          overflow: auto;
          color: #ffb18c;
          font-family: monospace;
          font-size: 10px;
          white-space: nowrap;
        }

        .finding-recommendation {
          margin-top: 13px;
          border-left: 2px solid var(--forge-orange);
          background: #ff713808;
          padding: 12px;
        }

        .recommendation-heading {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #ffad85;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .finding-recommendation p {
          margin-top: 8px;
          color: #a7aca8;
          font-size: 11px;
          line-height: 1.8;
        }

        .finding-expand {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 15px;
          border: 0;
          background: transparent;
          padding: 3px 0;
          color: #858a86;
          font-size: 10px !important;
          cursor: pointer;
          transition: color 150ms ease;
        }

        .finding-expand:hover { color: #ffad85; }

        .finding-expand svg { transition: transform 180ms ease; }
        .finding-expand .rotate-icon { transform: rotate(180deg); }

        .finding-extra {
          display: grid;
          gap: 9px;
          margin-top: 13px;
          border-top: 1px solid var(--forge-border);
          padding-top: 13px;
          animation: forge-enter 180ms ease both;
        }

        .finding-extra > div {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 10px;
          font-size: 10px;
        }

        .finding-extra > div > :first-child { color: #858a86; }
        .finding-extra code { color: #c7cbc7; font-family: monospace; }

        .empty-state {
          border: 1px dashed #ffffff22;
          background: #ffffff02;
          padding: 45px 20px;
          text-align: center;
        }

        .empty-state-icon {
          display: grid;
          width: 48px;
          height: 48px;
          place-items: center;
          margin-inline: auto;
          border: 1px solid #8cdaa533;
          background: #8cdaa50c;
          color: var(--forge-green);
        }

        .empty-state h3 {
          margin-top: 16px;
          font-size: 14px;
          font-weight: 600;
        }

        .empty-state p {
          max-width: 440px;
          margin: 9px auto 0;
          color: #929792;
          font-size: 11px;
          line-height: 1.8;
        }

        .recommendation-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .recommendation-card {
          border: 1px solid var(--forge-border);
          background: linear-gradient(145deg, #151717, #101111);
          padding: 20px;
        }

        .recommendation-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .recommendation-icon {
          display: grid;
          width: 37px;
          height: 37px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid #ff713844;
          background: var(--forge-orange-soft);
          color: var(--forge-orange);
        }

        .recommendation-card h3 {
          font-size: 12px;
          font-weight: 600;
        }

        .recommendation-card-header p {
          margin-top: 5px;
          color: #858a86;
          font-size: 10px;
        }

        .recommendation-list {
          display: grid;
          gap: 12px;
          margin-top: 20px;
          padding: 0;
          list-style: none;
        }

        .recommendation-list li {
          display: flex;
          gap: 10px;
          color: #a5aaa6;
          font-size: 11px;
          line-height: 1.8;
        }

        .recommendation-list li svg {
          flex: 0 0 auto;
          margin-top: 3px;
          color: var(--forge-orange);
        }

        .details-list {
          display: grid;
          gap: 8px;
        }

        .detail-row {
          overflow: hidden;
          border: 1px solid var(--forge-border);
          background: #111313;
          transition: border-color 180ms ease;
        }

        .detail-row[open] { border-color: #ff71383c; }

        .detail-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 18px;
          cursor: pointer;
          list-style: none;
        }

        .detail-summary::-webkit-details-marker { display: none; }

        .detail-summary-left {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
        }

        .detail-icon {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid var(--forge-border);
          background: #ffffff04;
          color: #a9aeaa;
        }

        .detail-summary h3 {
          font-size: 12px;
          font-weight: 600;
        }

        .detail-summary p {
          margin-top: 5px;
          overflow-wrap: anywhere;
          color: #858a86;
          font-family: monospace;
          font-size: 9px;
        }

        .detail-summary-right {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 12px;
          color: #929792;
        }

        .detail-count {
          border: 1px solid var(--forge-border);
          padding: 6px 8px;
          font-family: monospace;
          font-size: 9px;
        }

        .detail-chevron { transition: transform 200ms ease; }
        .detail-row[open] .detail-chevron { transform: rotate(180deg); }

        .detail-body {
          border-top: 1px solid var(--forge-border);
          padding: 20px;
          animation: forge-enter 220ms ease both;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
        }

        .metric-cell {
          min-width: 0;
          border: 1px solid #ffffff0d;
          background: #0000001e;
          padding: 13px;
        }

        .metric-cell dt {
          overflow-wrap: anywhere;
          color: #858a86;
          font-family: monospace;
          font-size: 9px;
          line-height: 1.6;
          text-transform: uppercase;
        }

        .metric-cell dd {
          margin-top: 8px;
          overflow-wrap: anywhere;
          color: #e5e7e1;
          font-size: 12px;
          font-weight: 550;
        }

        .muted-text {
          color: #929792;
          font-size: 11px;
        }

        .coverage-panel {
          margin-top: 30px;
          border: 1px solid var(--forge-border);
          background:
            radial-gradient(ellipse at 0% 0%, #ff71380c, transparent 55%),
            #111313;
          padding: clamp(20px, 3vw, 30px);
        }

        .coverage-intro {
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }

        .coverage-icon {
          display: grid;
          width: 39px;
          height: 39px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid #ff713844;
          background: var(--forge-orange-soft);
          color: var(--forge-orange);
        }

        .coverage-intro h3 {
          font-size: 13px;
          font-weight: 600;
        }

        .coverage-intro p {
          max-width: 800px;
          margin-top: 8px;
          color: #929792;
          font-size: 11px;
          line-height: 1.85;
        }

        .coverage-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
          margin-top: 23px;
        }

        .coverage-cell {
          border: 1px solid #ffffff0d;
          background: #00000020;
          padding: 15px;
        }

        .coverage-cell dt {
          color: #858a86;
          font-size: 10px;
        }

        .coverage-cell dd {
          margin-top: 9px;
          font-size: 21px;
          font-weight: 650;
          letter-spacing: -0.05em;
          font-variant-numeric: tabular-nums;
        }

        .coverage-warning {
          display: flex;
          gap: 9px;
          margin-top: 16px;
          color: var(--forge-yellow);
          font-size: 11px;
          line-height: 1.7;
        }

        .process-section {
          border-bottom: 1px solid var(--forge-border);
        }

        .process-content { padding-block: 70px 80px; }

        .process-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .process-card {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--forge-border);
          background: linear-gradient(145deg, #151717, #101111);
          padding: 23px;
          transition: transform 200ms ease, border-color 200ms ease;
        }

        .process-card:hover {
          transform: translateY(-4px);
          border-color: #ff71384a;
        }

        .process-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .process-number {
          color: var(--forge-orange);
          font-family: monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        .process-icon {
          display: grid;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid var(--forge-border);
          background: #ffffff04;
          color: #b5bab6;
          transition: all 180ms ease;
        }

        .process-card:hover .process-icon {
          border-color: #ff713844;
          background: var(--forge-orange-soft);
          color: var(--forge-orange);
        }

        .process-card h3 {
          margin-top: 26px;
          font-size: 18px;
          font-weight: 650;
          letter-spacing: -0.04em;
        }

        .process-card p {
          margin-top: 10px;
          color: #929792;
          font-size: 11px;
          line-height: 1.9;
        }

        .forge-footer { padding-block: 25px; }

        .forge-footer-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .forge-footer-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #a1a6a2;
          font-size: 10px;
        }

        .forge-footer-brand strong { color: #f2f1ed; }

        .forge-footer-mark {
          display: grid;
          width: 29px;
          height: 29px;
          place-items: center;
          border: 1px solid #ff713844;
          color: var(--forge-orange);
          font-weight: 800;
        }

        .forge-footer-note {
          color: #777c78;
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
        }

        .back-to-top {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 45;
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 1px solid #ff713866;
          background: #171615eF;
          color: var(--forge-orange);
          box-shadow: 0 8px 30px #0005;
          cursor: pointer;
          animation: forge-enter 180ms ease both;
          transition: transform 180ms ease, background 180ms ease;
        }

        .back-to-top:hover {
          transform: translateY(-3px);
          background: #2a1a13;
        }

        .capitalize { text-transform: capitalize; }

        @keyframes forge-enter {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes forge-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }

        @keyframes forge-shimmer {
          0%, 65% { left: -100%; }
          85%, 100% { left: 160%; }
        }

        @keyframes forge-gradient {
          from { background-position: 0% 50%; }
          to { background-position: 100% 50%; }
        }

        @keyframes forge-grid-drift {
          from { background-position: 0 0; }
          to { background-position: 42px 42px; }
        }

        @keyframes forge-scan {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(320%); }
        }

        @keyframes forge-meter-enter {
          from { width: 0; }
        }

        @keyframes forge-score-draw {
          from { stroke-dasharray: 0 500; }
        }

        @media (max-width: 1020px) {
          .forge-shell { width: min(100% - 44px, 900px); }
          .hero-layout {
            grid-template-columns: minmax(0, 1fr);
            gap: 45px;
            padding-top: 65px;
          }
          .hero-copy { max-width: 760px; }
          .terminal-card { width: 100%; max-width: 650px; }
          .hero-number-row { margin-top: 38px; }
          .overview-grid { grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); }
          .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 700px) {
          .forge-shell { width: calc(100% - 32px); }
          .forge-nav { min-height: 64px; }
          .forge-brand-mark { width: 35px; height: 35px; }
          .forge-brand-sub { font-size: 8px; }
          .engine-status { display: none; }
          .nav-menu-button { display: grid; place-items: center; }
          .forge-nav-links {
            position: absolute;
            top: 63px;
            right: 16px;
            left: 16px;
            display: none;
            align-items: stretch;
            gap: 0;
            border: 1px solid var(--forge-border);
            background: #111313;
            padding: 7px;
            box-shadow: 0 15px 40px #0008;
          }
          .forge-nav-links.mobile-open { display: flex; flex-direction: column; }
          .forge-nav-links a { padding: 13px; }
          .hero-layout { padding-block: 58px 40px; gap: 38px; }
          .hero-title { font-size: clamp(50px, 14vw, 76px); }
          .hero-description { font-size: 13px; }
          .hero-number-row { gap: 21px; }
          .hero-number { font-size: 21px; }
          .hero-number-label { font-size: 8px; }
          .terminal-content { padding: 20px; }
          .terminal-title { font-size: 22px; }
          .report-content { padding-block: 40px 50px; }
          .report-top { align-items: flex-start; flex-direction: column; }
          .report-actions { width: 100%; }
          .overview-grid { grid-template-columns: minmax(0, 1fr); }
          .score-panel { min-height: 390px; }
          .category-section,
          .findings-section,
          .recommendations-section,
          .details-section { margin-top: 50px; }
          .section-heading { align-items: flex-start; flex-direction: column; gap: 15px; }
          .section-heading-main { gap: 12px; }
          .section-index { width: 29px; height: 29px; }
          .section-title { font-size: 25px; }
          .category-grid,
          .findings-grid,
          .recommendation-grid,
          .process-grid { grid-template-columns: minmax(0, 1fr); }
          .category-description { min-height: auto; }
          .findings-toolbar { align-items: flex-start; flex-direction: column; }
          .filter-list { gap: 6px; }
          .filter-button { padding: 8px 9px; }
          .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .coverage-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .process-content { padding-block: 50px; }
          .forge-footer-content { align-items: flex-start; flex-direction: column; }
          .forge-footer-note { line-height: 1.8; }
          .back-to-top { right: 14px; bottom: 14px; }
        }

        .ai-assistant-section {
          margin-top: 72px;
        }

        .ai-panel {
          overflow: hidden;
          border: 1px solid var(--forge-border);
          background: radial-gradient(ellipse at 0% 0%, #ff71380d, transparent 48%), #111313;
        }

        .ai-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          border-bottom: 1px solid var(--forge-border);
        }

        .ai-panel-intro {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .ai-status-icon,
        .ai-empty-icon {
          display: grid;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          place-items: center;
          border: 1px solid #ff71384a;
          background: var(--forge-orange-soft);
          color: var(--forge-orange);
        }

        .ai-panel-intro h3,
        .ai-empty-state h3 {
          font-size: 14px;
          font-weight: 650;
        }

        .ai-panel-intro p {
          margin-top: 5px;
          color: #858a86;
          font-size: 11px;
        }

        .ai-disclaimer {
          padding: 14px 24px;
          border-bottom: 1px solid var(--forge-border);
          color: #8b908b;
          font-size: 11px;
          line-height: 1.8;
        }

        .ai-results {
          padding: 24px;
        }

        .ai-summary {
          padding: 22px;
          border: 1px solid #ff71382e;
          background: #ff713808;
        }

        .ai-kicker {
          color: var(--forge-orange);
          font-family: monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        .ai-summary > p {
          margin-top: 12px;
          color: #d5d8d4;
          font-size: 13px;
          line-height: 1.9;
          white-space: pre-wrap;
        }

        .ai-model-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 15px;
          color: #969b96;
          font-size: 10px;
        }

        .ai-model-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #72c69a;
        }

        .ai-subsection {
          margin-top: 30px;
        }

        .ai-subsection-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .ai-subsection-heading h3 {
          margin-top: 8px;
          font-size: 18px;
          font-weight: 600;
        }

        .ai-count {
          color: #989d98;
          font-family: monospace;
          font-size: 10px;
        }

        .ai-insight-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .ai-insight-card {
          min-width: 0;
          padding: 19px;
          border: 1px solid var(--forge-border);
          background: #111313;
        }

        .ai-insight-top,
        .ai-task-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ai-insight-number,
        .ai-task-number {
          color: #8c918c;
          font-family: monospace;
          font-size: 10px;
        }

        .ai-priority {
          display: inline-flex;
          border: 1px solid var(--forge-border);
          padding: 4px 7px;
          color: #b5b9b5;
          font-size: 9px;
          text-transform: uppercase;
        }

        .ai-priority-high {
          border-color: #ff6d6550;
          background: #ff6d6510;
          color: #ff918b;
        }

        .ai-priority-medium {
          border-color: #e5b85b45;
          background: #e5b85b0c;
          color: #e8c57c;
        }

        .ai-priority-low {
          border-color: #72c69a40;
          background: #72c69a0b;
          color: #86d5a9;
        }

        .ai-insight-card h4,
        .ai-task-content h4 {
          margin-top: 16px;
          color: #e5e7e3;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.6;
        }

        .ai-insight-card > p,
        .ai-task-content > p {
          margin-top: 8px;
          color: #a1a6a1;
          font-size: 11px;
          line-height: 1.9;
          overflow-wrap: anywhere;
        }

        .ai-task-list {
          display: grid;
          gap: 10px;
        }

        .ai-task {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          padding: 19px;
          border: 1px solid var(--forge-border);
          background: #111313;
        }

        .ai-task-complete {
          border-color: #72c69a40;
          background: #72c69a06;
        }

        .ai-task-checkbox {
          position: relative;
          display: grid;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          place-items: center;
          margin-top: 2px;
          cursor: pointer;
        }

        .ai-task-checkbox input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
        }

        .ai-checkbox-mark {
          display: grid;
          width: 19px;
          height: 19px;
          place-items: center;
          border: 1px solid #555b55;
          color: transparent;
        }

        .ai-task-checkbox input:checked + .ai-checkbox-mark {
          border-color: #72c69a;
          background: #72c69a;
          color: #101511;
        }

        .ai-task-checkbox input:focus-visible + .ai-checkbox-mark {
          outline: 2px solid var(--forge-orange);
          outline-offset: 3px;
        }

        .ai-task-content {
          min-width: 0;
          flex: 1;
        }

        .ai-task-content h4 {
          margin-top: 10px;
        }

        .ai-task-complete .ai-task-content h4 {
          color: #8d9a90;
          text-decoration: line-through;
        }

        .ai-related-finding {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: 12px;
          color: #ffad84;
          font-size: 10px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .ai-related-finding svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .ai-empty-state,
        .ai-loading {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 28px 24px;
        }

        .ai-empty-state p,
        .ai-loading p {
          max-width: 620px;
          margin-top: 7px;
          color: #929792;
          font-size: 11px;
          line-height: 1.9;
        }

        .ai-loading {
          border-bottom: 1px solid var(--forge-border);
        }

        .ai-loading > svg {
          flex-shrink: 0;
          color: var(--forge-orange);
        }

        .ai-spinner {
          animation: ai-spin 1s linear infinite;
        }

        @keyframes ai-spin {
          to { transform: rotate(360deg); }
        }

        .ai-error {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 18px 24px;
          border-bottom: 1px solid #ff6d6540;
          background: #ff6d6509;
          color: #ff918b;
        }

        .ai-error > svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .ai-error strong {
          font-size: 12px;
        }

        .ai-error p {
          margin-top: 7px;
          color: #c2a5a2;
          font-size: 11px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .ai-retry-button {
          margin-top: 12px;
          border: 1px solid #ff6d6550;
          padding: 8px 12px;
          color: #ffaaa4;
          font-size: 11px;
        }

        .ai-retry-button:hover {
          background: #ff6d6512;
        }

        .ai-empty {
          padding: 18px;
          border: 1px dashed var(--forge-border);
          color: #929792;
          font-size: 11px;
          line-height: 1.8;
        }

        @media (max-width: 700px) {
          .ai-assistant-section { margin-top: 50px; }
          .ai-panel-header {
            align-items: flex-start;
            flex-direction: column;
          }
          .ai-insight-grid { grid-template-columns: minmax(0, 1fr); }
          .ai-results { padding: 16px; }
          .ai-subsection-heading { align-items: flex-start; }
          .ai-empty-state,
          .ai-loading { align-items: flex-start; padding: 22px 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .forge-app *,
          .forge-app *::before,
          .forge-app *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <header className="forge-header">
        <div className="forge-shell forge-nav">
          <Link
            href="/"
            className="forge-brand"
            aria-label="RepoLens home"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="forge-brand-mark">R</div>
            <div>
              <div className="forge-brand-name">
                RepoLens<span>.</span>
              </div>
              <div className="forge-brand-sub">REPOSITORY INTELLIGENCE</div>
            </div>
          </Link>

          <div className="engine-status">
            <span className="engine-light" />
            STATIC ANALYSIS ENGINE
          </div>

          <nav
            className={`forge-nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}
            aria-label="Main navigation"
          >
            <a href="#process" onClick={() => setMobileMenuOpen(false)}>
              How it works
            </a>
            <a href="#dimensions" onClick={() => setMobileMenuOpen(false)}>
              Dimensions
            </a>
            <a href="#findings" onClick={() => setMobileMenuOpen(false)}>
              Findings
            </a>
            <a
              href="#analyze"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: "#ff9a6b" }}
            >
              Start analysis <ArrowUpRight size={13} />
            </a>
          </nav>

          <button
            type="button"
            className="nav-menu-button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <section className="forge-hero">
        <div className="forge-shell">
          <div className="hero-layout">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                DEVELOPER TOOLING / 001
              </p>

              <h1 className="hero-title">
                See beyond
                <br />
                the <span className="muted-word">surface.</span>
                <br />
                <span className="ember-word">Know your code.</span>
              </h1>

              <p className="hero-description">
                A better view of your repository, built for people who care
                about what ships. Explore <strong>code structure, testing,
                security, maintainability</strong> and the signals that tell
                you where to improve.
              </p>

              <div className="hero-points">
                <div className="hero-point">
                  <CircleCheck size={14} /> Seven health dimensions
                </div>
                <div className="hero-point">
                  <ShieldCheck size={14} /> No code execution
                </div>
                <div className="hero-point">
                  <Activity size={14} /> Transparent scoring
                </div>
              </div>

              <div className="hero-number-row">
                <div>
                  <div className="hero-number">07<span>.</span></div>
                  <div className="hero-number-label">HEALTH DIMENSIONS</div>
                </div>
                <div>
                  <div className="hero-number">100<span>%</span></div>
                  <div className="hero-number-label">WEIGHTED SCORING</div>
                </div>
                <div>
                  <div className="hero-number">01<span>×</span></div>
                  <div className="hero-number-label">CLEAR REPORT</div>
                </div>
              </div>
            </div>

            <div id="analyze" className="terminal-card">
              <div className="terminal-topbar">
                <div className="terminal-lights" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="terminal-label">REPOLENS / INSPECTOR</div>
                <Activity size={14} color="#ff7138" />
              </div>

              <div className="terminal-content">
                <p className="terminal-index">01 / NEW ANALYSIS</p>
                <h2 className="terminal-title">Inspect a repository.</h2>
                <p className="terminal-subtitle">
                  Drop in a public GitHub URL. Get a structured health report
                  with scores, findings and actionable recommendations.
                </p>

                <div style={{ marginTop: 25 }}>
                  <label className="input-label" htmlFor="repository-url">
                    REPOSITORY URL
                  </label>

                  <div
                    className={`repo-input-wrap ${error ? "has-error" : ""}`}
                  >
                    <GitBranch
                      size={17}
                      className="repo-input-icon"
                      aria-hidden="true"
                    />
                    <input
                      id="repository-url"
                      className="repo-input"
                      type="url"
                      autoComplete="url"
                      value={repositoryUrl}
                      onChange={(event) => {
                        setRepositoryUrl(event.target.value);
                        setError("");
                      }}
                      onKeyDown={handleInputKeyDown}
                      placeholder="github.com/owner/repository"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "analysis-error" : undefined}
                    />
                    {repositoryUrl && (
                      <button
                        type="button"
                        className="repo-input-clear"
                        aria-label="Clear repository URL"
                        onClick={() => {
                          setRepositoryUrl("");
                          setError("");
                        }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="analyze-button"
                    onClick={() => void handleAnalyze()}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin" />
                        Inspecting repository
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        Analyze repository
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  {error && (
                    <div id="analysis-error" className="terminal-error" role="alert">
                      <CircleAlert size={15} style={{ flex: "0 0 auto", marginTop: 2 }} />
                      {error}
                    </div>
                  )}

                  {isLoading && (
                    <div className="scan-panel" role="status" aria-live="polite">
                      <div className="scan-panel-heading">
                        <LoaderCircle size={15} className="animate-spin" />
                        Analysis in progress
                      </div>
                      <p className="scan-stage">{SCAN_STAGES[scanStage]}...</p>
                      <div
                        className="scan-progress"
                        role="progressbar"
                        aria-label="Analysis in progress"
                      >
                        <div className="scan-progress-fill" />
                      </div>
                      <div className="scan-stage-list">
                        {SCAN_STAGES.map((stage, index) => (
                          <div
                            key={stage}
                            className={`scan-stage-item ${index === scanStage ? "active" : ""}`}
                          >
                            {index < scanStage ? (
                              <CheckCheck size={12} />
                            ) : index === scanStage ? (
                              <LoaderCircle size={12} className="animate-spin" />
                            ) : (
                              <span style={{ width: 12, textAlign: "center" }}>·</span>
                            )}
                            {stage}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="examples">
                    <span className="examples-label">TRY ONE</span>
                    {EXAMPLES.map((example) => (
                      <button
                        type="button"
                        className="example-chip"
                        key={example.label}
                        disabled={isLoading}
                        onClick={() => {
                          setRepositoryUrl(example.url);
                          setError("");
                        }}
                      >
                        {example.label}
                        <ArrowUpRight
                          size={10}
                          style={{ display: "inline", marginLeft: 4 }}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="terminal-trust">
                    <span>
                      <LockKeyhole size={12} /> Public repositories
                    </span>
                    <span>
                      <ShieldCheck size={12} /> No code execution
                    </span>
                  </div>
                </div>
              </div>

              <div className="terminal-bottom">
                <div className="terminal-bottom-cell">
                  <div className="terminal-bottom-value">07</div>
                  <div className="terminal-bottom-label">DIMENSIONS</div>
                </div>
                <div className="terminal-bottom-cell">
                  <div className="terminal-bottom-value">STATIC</div>
                  <div className="terminal-bottom-label">INSPECTION</div>
                </div>
                <div className="terminal-bottom-cell">
                  <div className="terminal-bottom-value">WEIGHTED</div>
                  <div className="terminal-bottom-label">SCORING</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-footnote">
            <div>BUILT FOR THE PEOPLE BEHIND THE CODE</div>
            <div>
              ANALYZE <span> / </span> UNDERSTAND <span> / </span> IMPROVE
            </div>
          </div>
        </div>
      </section>

      {report && (
        <section
          id="report"
          className="report-section"
          aria-label="Repository analysis report"
        >
          <div className="forge-shell report-content rl-dashboard">
            <div className="report-top">
              <div style={{ minWidth: 0 }}>
                <div className="report-complete">
                  <CircleCheck size={13} />
                  ANALYSIS COMPLETE
                </div>
                <h2 className="report-title">
                  {report.repository.owner}/{report.repository.name}
                </h2>
                {report.repository.description && (
                  <p className="report-description">
                    {report.repository.description}
                  </p>
                )}
                <a
                  href={repositoryLink}
                  target="_blank"
                  rel="noreferrer"
                  className="outline-button"
                  style={{ marginTop: 15 }}
                >
                  <GitBranch size={13} />
                  View on GitHub
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="report-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => void copyRepositoryLink()}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  className="outline-button"
                  onClick={startNewAnalysis}
                >
                  <RefreshCw size={14} />
                  New analysis
                </button>
              </div>
            </div>

            <div className="overview-grid">
              <section className="forge-panel panel-pad score-panel">
                <p className="panel-kicker">Repository health</p>
                <h3 className="panel-title">Overall score</h3>
                <p className="panel-subtitle">Weighted repository assessment</p>

                {report.score.score !== null && report.score.rating !== null ? (
                  <ScoreRing
                    score={report.score.score}
                    rating={report.score.rating}
                  />
                ) : (
                  <div className="empty-state" style={{ marginTop: 22 }}>
                    <CircleAlert
                      size={26}
                      style={{ marginInline: "auto", color: "#f5c66c" }}
                    />
                    <h3>Score unavailable</h3>
                    <p>
                      Some weighted categories are missing. A complete overall
                      score is withheld.
                    </p>
                  </div>
                )}

                <div className="score-summary">
                  <div className="score-summary-cell">
                    <div className="score-summary-label">
                      <TrendingUp size={13} /> Score coverage
                    </div>
                    <div className="score-summary-value">
                      {report.score.coveragePercent}%
                    </div>
                  </div>
                  <div className="score-summary-cell">
                    <div className="score-summary-label">
                      <FileSearch size={13} /> Findings
                    </div>
                    <div className="score-summary-value">
                      {formatNumber(allFindings.length)}
                    </div>
                  </div>
                </div>

                {report.score.missingCategories.length > 0 && (
                  <p className="coverage-warning">
                    <CircleAlert size={14} />
                    Missing categories: {report.score.missingCategories.join(", ")}
                  </p>
                )}
              </section>

              <section className="forge-panel panel-pad">
                <div className="profile-header">
                  <div>
                    <p className="panel-kicker">Repository profile</p>
                    <h3 className="panel-title">The details.</h3>
                    <p className="panel-subtitle">
                      Retrieved from Git metadata
                    </p>
                  </div>
                  {report.repository.language && (
                    <span className="language-pill">
                      <Code2 size={13} />
                      {report.repository.language}
                    </span>
                  )}
                </div>

                <dl className="profile-grid">
                  {[
                    { label: "Stars", value: formatNumber(report.repository.stars), icon: Star },
                    { label: "Forks", value: formatNumber(report.repository.forks), icon: GitBranch },
                    { label: "Open issues", value: formatNumber(report.repository.issues), icon: CircleAlert },
                    { label: "Watchers", value: formatNumber(report.repository.watchers), icon: Activity },
                    { label: "Default branch", value: report.repository.defaultBranch ?? "—", icon: GitBranch },
                    { label: "License", value: report.repository.license ?? "Not detected", icon: ShieldCheck },
                    { label: "Last pushed", value: formatDate(report.repository.pushedAt), icon: Clock3 },
                    { label: "Last updated", value: formatDate(report.repository.updatedAt), icon: RefreshCw },
                  ].map(({ label, value, icon: Icon }) => (
                    <div className="profile-stat" key={label}>
                      <dt>
                        <Icon size={13} />
                        {label}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>

                {(report.repository.archived || report.repository.fork) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 23 }}>
                    {report.repository.archived && (
                      <span className="severity-pill severity-medium">
                        Archived repository
                      </span>
                    )}
                    {report.repository.fork && (
                      <span className="severity-pill severity-info">
                        Fork
                      </span>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div id="dimensions" className="category-section">
              <SectionTitle
                index="01"
                eyebrow="SCORING BREAKDOWN"
                title="Seven dimensions. One clearer picture."
                description="Explore how each weighted category contributes to repository health. Dependency analysis and code statistics are reported separately when they do not affect the overall score."
              />

              <div className="category-grid">
                {weightedResults.map((item) => (
                  <CategoryCard key={item.category} item={item} />
                ))}
              </div>
            </div>

            <div id="findings" className="findings-section">
              <SectionTitle
                index="02"
                eyebrow="SIGNAL / NOISE"
                title="What needs attention?"
                description="Filter findings by severity, inspect file references, and expand individual items for additional details."
                action={
                  <span className="section-action">
                    <FileSearch size={13} />
                    {allFindings.length} findings
                  </span>
                }
              />

              <div className="findings-toolbar">
                <div className="filter-list" role="group" aria-label="Filter findings by severity">
                  <button
                    type="button"
                    className={`filter-button ${activeSeverity === "all" ? "active" : ""}`}
                    onClick={() => setActiveSeverity("all")}
                    aria-pressed={activeSeverity === "all"}
                  >
                    All <span className="filter-count">{allFindings.length}</span>
                  </button>
                  {SEVERITIES.map((severity) => (
                    <button
                      type="button"
                      key={severity}
                      className={`filter-button ${activeSeverity === severity ? "active" : ""}`}
                      onClick={() => setActiveSeverity(severity)}
                      aria-pressed={activeSeverity === severity}
                    >
                      <span className="capitalize">{severity}</span>
                      <span className="filter-count">{severityCounts[severity]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredFindings.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    {allFindings.length === 0 ? (
                      <CircleCheck size={22} />
                    ) : (
                      <Search size={22} />
                    )}
                  </div>
                  <h3>
                    {allFindings.length === 0
                      ? "No findings were reported"
                      : `No ${activeSeverity} findings`}
                  </h3>
                  <p>
                    {allFindings.length === 0
                      ? "The analyzers did not report findings for this repository. This does not guarantee the absence of defects or vulnerabilities."
                      : "Choose another severity filter to see more results."}
                  </p>
                  {activeSeverity !== "all" && allFindings.length > 0 && (
                    <button
                      type="button"
                      className="outline-button"
                      style={{ marginTop: 16 }}
                      onClick={() => setActiveSeverity("all")}
                    >
                      Show all findings <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="findings-grid">
                  {filteredFindings.map((finding, index) => (
                    <FindingCard
                      key={`${finding.id}-${finding.file ?? ""}-${index}`}
                      finding={finding}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="recommendations-section">
              <SectionTitle
                index="03"
                eyebrow="NEXT MOVES"
                title="Turn signals into action."
                description="Recommendations produced by the existing analyzers, grouped by analysis area."
              />

              <div className="recommendation-grid">
                {Object.entries(report.analysis)
                  .filter(([, result]) => result.recommendations?.length)
                  .map(([key, result]) => {
                    const Icon = CATEGORY_ICONS[result.category] ?? Zap;

                    return (
                      <article className="recommendation-card interactive-card" key={key}>
                        <div className="recommendation-card-header">
                          <div className="recommendation-icon">
                            <Icon size={17} />
                          </div>
                          <div>
                            <h3>{result.category}</h3>
                            <p>
                              {result.recommendations.length} suggested{" "}
                              {result.recommendations.length === 1 ? "action" : "actions"}
                            </p>
                          </div>
                        </div>
                        <ul className="recommendation-list">
                          {result.recommendations.map((recommendation, index) => (
                            <li key={`${key}-${index}`}>
                              <ArrowDownRight size={15} />
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    );
                  })}
              </div>
            </div>

            <div className="ai-assistant-section">
              <SectionTitle
                index="04"
                eyebrow="LOCAL AI ASSISTANT"
                title="Turn findings into a plan."
                description="Turn the existing static-analysis report into prioritized insights and practical tasks using your local Ollama model."
              />

              <div className="ai-panel">
                <div className="ai-panel-header">
                  <div className="ai-panel-intro">
                    <div className="ai-status-icon">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3>RepoLens Intelligence</h3>
                      <p>Private local inference | Ollama | llama3.2</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => void handleAiAnalysis()}
                    disabled={isAiLoading}
                  >
                    {isAiLoading ? (
                      <>
                        <LoaderCircle size={15} className="ai-spinner" />
                        Generating insights...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        {aiResult ? "Regenerate insights" : "Generate AI insights"}
                      </>
                    )}
                  </button>
                </div>

                <p className="ai-disclaimer">
                  The model uses the report metadata, scores, findings, and analyzer
                  recommendations. It does not independently inspect your source code.
                </p>

                {aiError && (
                  <div className="ai-error" role="alert">
                    <AlertCircle size={17} />
                    <div>
                      <strong>AI analysis could not be completed</strong>
                      <p>{aiError}</p>
                      <button
                        type="button"
                        className="ai-retry-button"
                        onClick={() => void handleAiAnalysis()}
                        disabled={isAiLoading}
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}

                {isAiLoading && (
                  <div className="ai-loading" role="status" aria-live="polite">
                    <LoaderCircle size={20} className="ai-spinner" />
                    <div>
                      <strong>Reviewing the analysis report</strong>
                      <p>
                        Your local model is organizing findings into actionable
                        improvements. This may take a little while.
                      </p>
                    </div>
                  </div>
                )}

                {aiResult && !isAiLoading && (
                  <div className="ai-results">
                    <div className="ai-summary">
                      <span className="ai-kicker">EXECUTIVE SUMMARY</span>
                      <p>{aiResult.summary || "No summary was provided."}</p>
                      <span className="ai-model-label">
                        <span className="ai-model-dot" />
                        Generated locally with {aiResult.model}
                      </span>
                    </div>

                    <div className="ai-subsection">
                      <div className="ai-subsection-heading">
                        <div>
                          <span className="ai-kicker">01 / KEY SIGNALS</span>
                          <h3>What deserves attention.</h3>
                        </div>
                        <span className="ai-count">
                          {aiResult.insights.length} insights
                        </span>
                      </div>

                      {aiResult.insights.length > 0 ? (
                        <div className="ai-insight-grid">
                          {aiResult.insights.map((insight, index) => (
                            <article
                              className="ai-insight-card"
                              key={`${insight.title}-${index}`}
                            >
                              <div className="ai-insight-top">
                                <span className="ai-insight-number">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <span className={`ai-priority ai-priority-${insight.priority}`}>
                                  {insight.priority} priority
                                </span>
                              </div>
                              <h4>{insight.title}</h4>
                              <p>{insight.detail}</p>
                              <div
                                className={`ai-evidence-label ${
                                  insight.evidenceStatus === "matched"
                                    ? "ai-evidence-matched"
                                    : "ai-evidence-general"
                                }`}
                              >
                                {insight.evidenceStatus === "matched" ? (
                                  <>
                                    <span>Matched report finding</span>
                                    {insight.evidenceFile && (
                                      <code>{insight.evidenceFile}</code>
                                    )}
                                  </>
                                ) : (
                                  <span>General recommendation - no direct finding match</span>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="ai-empty">No insights were returned. Try again.</p>
                      )}
                    </div>

                    <div className="ai-subsection">
                      <div className="ai-subsection-heading">
                        <div>
                          <span className="ai-kicker">02 / ACTION PLAN</span>
                          <h3>Small steps. Measurable progress.</h3>
                        </div>
                        <span className="ai-count">
                          {completedAiTasks.length} / {aiResult.tasks.length} done
                        </span>
                      </div>

                      <div
                        className="ai-task-progress-track"
                        role="progressbar"
                        aria-label="AI action plan completion"
                        aria-valuemin={0}
                        aria-valuemax={aiResult.tasks.length}
                        aria-valuenow={completedAiTasks.length}
                      >
                        <span
                          className="ai-task-progress-fill"
                          style={{
                            width: `${aiResult.tasks.length > 0 ? (completedAiTasks.length / aiResult.tasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>

                      <div className="ai-task-list">
                        {aiResult.tasks.map((task, index) => {
                          const isComplete = completedAiTasks.includes(task.id);

                          return (
                            <article
                              className={`ai-task ${isComplete ? "ai-task-complete" : ""}`}
                              key={task.id}
                            >
                              <label className="ai-task-checkbox">
                                <input
                                  type="checkbox"
                                  checked={isComplete}
                                  onChange={(event) => {
                                    setCompletedAiTasks((current) =>
                                      event.target.checked
                                        ? [...current, task.id]
                                        : current.filter((id) => id !== task.id)
                                    );
                                  }}
                                />
                                <span className="ai-checkbox-mark">
                                  <Check size={12} />
                                </span>
                              </label>

                              <div className="ai-task-content">
                                <div className="ai-task-top">
                                  <span className="ai-task-number">
                                    TASK {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <span className={`ai-priority ai-priority-${task.priority}`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <h4>{task.title}</h4>
                                <p>{task.description}</p>
                                <div
                                  className={`ai-evidence-label ${
                                    task.evidenceStatus === "matched"
                                      ? "ai-evidence-matched"
                                      : "ai-evidence-general"
                                  }`}
                                >
                                  {task.evidenceStatus === "matched" ? (
                                    <>
                                      <ArrowDownRight size={13} />
                                      <span>Matched report finding: {task.evidenceTitle}</span>
                                      {task.evidenceFile && (
                                        <code>{task.evidenceFile}</code>
                                      )}
                                    </>
                                  ) : (
                                    <span>General recommendation - no direct finding match</span>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {aiResult.tasks.length === 0 && (
                        <p className="ai-empty">No tasks were returned. Try again.</p>
                      )}
                    </div>
                  </div>
                )}

                {!aiResult && !aiError && !isAiLoading && (
                  <div className="ai-empty-state">
                    <div className="ai-empty-icon">
                      <BrainCircuit size={23} />
                    </div>
                    <div>
                      <h3>Your next steps, intelligently prioritized.</h3>
                      <p>
                        Generate insights to get a concise summary, key signals,
                        and a checklist based on this repository report.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <SectionTitle
                index="05"
                eyebrow="UNDER THE HOOD"
                title="Metrics and coverage."
                description="Open any analyzer to inspect its reported metrics and findings, including analysis outputs outside the weighted score."
              />

              <div className="details-list">
                {Object.entries(report.analysis).map(([key, result]) => {
                  const Icon = CATEGORY_ICONS[result.category] ?? Database;

                  return (
                    <details className="detail-row" key={key} open={key === "codeStatistics"}>
                      <summary className="detail-summary">
                        <div className="detail-summary-left">
                          <div className="detail-icon">
                            <Icon size={17} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h3>{result.category}</h3>
                            <p>{result.analyzer}</p>
                          </div>
                        </div>
                        <div className="detail-summary-right">
                          <span className="detail-count">
                            {result.findings.length} findings
                          </span>
                          <ChevronDown size={16} className="detail-chevron" />
                        </div>
                      </summary>

                      <div className="detail-body">
                        <MetricGrid result={result} />
                        {result.findings.length > 0 && (
                          <div style={{ marginTop: 20 }}>
                            <h4 style={{ marginBottom: 12, fontSize: 12 }}>
                              Findings in this analyzer
                            </h4>
                            <div className="findings-grid">
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
                  );
                })}
              </div>
            </div>

            <section className="coverage-panel">
              <div className="coverage-intro">
                <div className="coverage-icon">
                  <Database size={18} />
                </div>
                <div>
                  <h3>Analysis coverage and limitations</h3>
                  <p>
                    These results use static analysis and Git metadata.
                    RepoLens does not execute repository code. Configured file
                    limits and excluded files can mean that not every file was
                    inspected, so interpret the findings in the context of the
                    coverage reported below.
                  </p>
                </div>
              </div>

              <dl className="coverage-grid">
                {[
                  { label: "Files in tree", value: formatNumber(report.tree.files?.length) },
                  { label: "Selected files", value: formatNumber(report.tree.analysisFiles?.length) },
                  { label: "Excluded files", value: formatNumber(report.tree.analysisExcludedFileCount) },
                  { label: "Tree truncated", value: report.tree.truncated ? "Yes" : "No" },
                ].map(({ label, value }) => (
                  <div className="coverage-cell" key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              {report.tree.analysisLimited && (
                <p className="coverage-warning">
                  <CircleAlert size={15} style={{ flex: "0 0 auto" }} />
                  Analysis was limited by configured safeguards. Interpret
                  findings in the context of the reported coverage.
                </p>
              )}
            </section>
          </div>
        </section>
      )}

      <section id="process" className="process-section">
        <div className="forge-shell process-content">
          <SectionTitle
            index="05"
            eyebrow="THE WORKFLOW"
            title="Three steps. No black box."
            description="A transparent pipeline that shows what is inspected and how the report is assembled."
          />

          <div className="process-grid">
            {[
              {
                number: "01 / RETRIEVE",
                title: "Get the context.",
                description:
                  "Retrieve public repository metadata and the Git tree through GitHub's API.",
                icon: GitBranch,
              },
              {
                number: "02 / INSPECT",
                title: "Read the signals.",
                description:
                  "Run deterministic analyzers against eligible files and repository metadata.",
                icon: FileSearch,
              },
              {
                number: "03 / PRIORITIZE",
                title: "Know what to do.",
                description:
                  "Explore weighted scores, findings, metrics, and suggested next actions.",
                icon: HeartPulse,
              },
            ].map((step) => {
              const Icon = step.icon;

              return (
                <article className="process-card" key={step.number}>
                  <div className="process-card-top">
                    <span className="process-number">{step.number}</span>
                    <div className="process-icon">
                      <Icon size={18} />
                    </div>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="forge-footer">
        <div className="forge-shell forge-footer-content">
          <Link href="/" className="forge-footer-brand">
            <span className="forge-footer-mark">R</span>
            <strong>RepoLens.</strong>
            <span>Repository health intelligence</span>
          </Link>
          <div className="forge-footer-note">
            STATIC ANALYSIS · TRANSPARENT SCORING · DEVELOPER FOCUSED
          </div>
        </div>
      </footer>

      <button
        type="button"
        className="back-to-top"
        aria-label="Back to top"
        title="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUpRight size={17} />
      </button>
    </main>
  );
}
