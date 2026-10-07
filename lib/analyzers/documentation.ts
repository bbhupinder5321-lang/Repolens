import type { Analyzer } from "@/lib/analyzer/analyzer"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type {
  AnalysisResult,
  Finding,
} from "@/lib/analyzer/types"

const DOCUMENTATION_FILES = [
  "readme",
  "readme.md",
  "readme.mdx",
  "readme.txt",
  "contributing.md",
  "code_of_conduct.md",
  "security.md",
  "changelog.md",
  "changes.md",
  "license",
  "license.md",
  "license.txt",
]

const README_NAMES = new Set([
  "readme",
  "readme.md",
  "readme.mdx",
  "readme.txt",
])

const CONTRIBUTING_NAMES = new Set([
  "contributing.md",
  "contributing",
])

const SECURITY_NAMES = new Set([
  "security.md",
  "security",
])

const CHANGELOG_NAMES = new Set([
  "changelog.md",
  "changelog",
  "changes.md",
  "changes",
])

const LICENSE_NAMES = new Set([
  "license",
  "license.md",
  "license.txt",
])

function getFileName(path: string): string {
  return (path.split("/").pop() ?? "").toLowerCase()
}

function hasFile(
  paths: string[],
  names: Set<string>
): boolean {
  return paths.some((path) =>
    names.has(getFileName(path))
  )
}

function countDocumentationFiles(
  paths: string[]
): number {
  return paths.filter((path) => {
    const fileName = getFileName(path)

    return DOCUMENTATION_FILES.includes(fileName)
  }).length
}

export const documentationAnalyzer: Analyzer = {
  name: "Documentation Analyzer",
  category: "Documentation",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const filePaths = context.tree.files
      .filter((file) => file.type === "file")
      .map((file) => file.path)

    const hasReadme = hasFile(filePaths, README_NAMES)
    const hasContributing = hasFile(
      filePaths,
      CONTRIBUTING_NAMES
    )
    const hasSecurityPolicy = hasFile(
      filePaths,
      SECURITY_NAMES
    )
    const hasChangelog = hasFile(
      filePaths,
      CHANGELOG_NAMES
    )
    const hasLicense = hasFile(
      filePaths,
      LICENSE_NAMES
    )

    const documentationFileCount =
      countDocumentationFiles(filePaths)

    const findings: Finding[] = []

    if (!hasReadme) {
      findings.push({
        id: "documentation-missing-readme",
        category: "Documentation",
        severity: "high",
        title: "README file is missing",
        description:
          "No README file was detected in the repository tree.",
        confidence: 1,
        recommendation:
          "Add a clear README explaining the project's purpose, setup, usage, and development workflow.",
      })
    }

    if (!hasContributing) {
      findings.push({
        id: "documentation-missing-contributing",
        category: "Documentation",
        severity: "low",
        title: "Contribution guidelines are missing",
        description:
          "No CONTRIBUTING file was detected in the repository tree.",
        confidence: 0.95,
        recommendation:
          "Add contribution guidelines covering development setup, coding standards, testing, and pull requests.",
      })
    }

    if (!hasSecurityPolicy) {
      findings.push({
        id: "documentation-missing-security-policy",
        category: "Documentation",
        severity: "low",
        title: "Security policy is missing",
        description:
          "No SECURITY file was detected in the repository tree.",
        confidence: 0.95,
        recommendation:
          "Consider adding a SECURITY.md file explaining how security vulnerabilities should be reported.",
      })
    }

    if (!hasChangelog) {
      findings.push({
        id: "documentation-missing-changelog",
        category: "Documentation",
        severity: "info",
        title: "Changelog is missing",
        description:
          "No CHANGELOG or equivalent changes file was detected.",
        confidence: 0.9,
        recommendation:
          "Consider maintaining a changelog when release history and user-facing changes are important to the project.",
      })
    }

    if (!hasLicense) {
      findings.push({
        id: "documentation-missing-license",
        category: "Documentation",
        severity: "medium",
        title: "License file is missing",
        description:
          "No license file was detected in the repository tree.",
        confidence: 1,
        recommendation:
          "Add an appropriate open-source license if the project is intended for public reuse.",
      })
    }

    const metrics = {
      documentationFileCount,
      hasReadme,
      hasContributing,
      hasSecurityPolicy,
      hasChangelog,
      hasLicense,
    }

    return {
      analyzer: "Documentation Analyzer",
      category: "Documentation",
      score: 0,
      findings,
      metrics,
      recommendations: [],
    }
  },
}