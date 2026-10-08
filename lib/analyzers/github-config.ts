import type { Analyzer } from "@/lib/analyzer/analyzer"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type {
  AnalysisResult,
  Finding,
} from "@/lib/analyzer/types"

const WORKFLOW_DIRECTORY = ".github/workflows"

const ISSUE_TEMPLATE_DIRECTORIES = [
  ".github/issue_template",
  ".github/issue_templates",
]

const PULL_REQUEST_TEMPLATE_PATHS = [
  ".github/pull_request_template.md",
  ".github/pull_request_template.txt",
  ".github/pull_request_template",
]

const COMMUNITY_HEALTH_FILES = new Set([
  "code_of_conduct.md",
  "contributing.md",
  "security.md",
  "support.md",
  "funding.yml",
])

const WORKFLOW_EXTENSIONS = new Set([
  ".yml",
  ".yaml",
])

const SECURITY_CONFIG_PATHS = new Set([
  ".github/dependabot.yml",
  ".github/dependabot.yaml",
  ".github/codeql-config.yml",
  ".github/codeql-config.yaml",
])

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase()
}

function getFileName(path: string): string {
  return (
    normalizePath(path)
      .split("/")
      .pop() ?? ""
  )
}

function getExtension(path: string): string {
  const fileName = getFileName(path)
  const dotIndex = fileName.lastIndexOf(".")

  if (dotIndex === -1) {
    return ""
  }

  return fileName.slice(dotIndex)
}

function isWorkflowFile(path: string): boolean {
  const normalizedPath =
    normalizePath(path)

  if (
    !normalizedPath.startsWith(
      `${WORKFLOW_DIRECTORY}/`
    )
  ) {
    return false
  }

  return WORKFLOW_EXTENSIONS.has(
    getExtension(normalizedPath)
  )
}

function isIssueTemplateFile(
  path: string
): boolean {
  const normalizedPath =
    normalizePath(path)

  return ISSUE_TEMPLATE_DIRECTORIES.some(
    (directory) =>
      normalizedPath.startsWith(
        `${directory}/`
      )
  )
}

function isPullRequestTemplate(
  path: string
): boolean {
  const normalizedPath =
    normalizePath(path)

  return PULL_REQUEST_TEMPLATE_PATHS.includes(
    normalizedPath
  )
}

function isCommunityHealthFile(
  path: string
): boolean {
  const normalizedPath =
    normalizePath(path)

  if (
    !normalizedPath.startsWith(".github/")
  ) {
    return false
  }

  return COMMUNITY_HEALTH_FILES.has(
    getFileName(normalizedPath)
  )
}

function isSecurityConfigFile(
  path: string
): boolean {
  return SECURITY_CONFIG_PATHS.has(
    normalizePath(path)
  )
}

function isCodeownersFile(
  path: string
): boolean {
  const normalizedPath =
    normalizePath(path)

  return (
    normalizedPath ===
      "codeowners" ||
    normalizedPath ===
      ".github/codeowners" ||
    normalizedPath ===
      "docs/codeowners"
  )
}

function isGitHubDirectory(
  path: string
): boolean {
  const normalizedPath =
    normalizePath(path)

  return (
    normalizedPath === ".github" ||
    normalizedPath.startsWith(
      ".github/"
    )
  )
}

export const githubConfigAnalyzer: Analyzer = {
  name: "GitHub Config Analyzer",
  category: "GitHub Practices",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const fileEntries =
      context.tree.files.filter(
        (file) => file.type === "file"
      )

    const directoryEntries =
      context.tree.files.filter(
        (file) => file.type === "directory"
      )

    const workflowFiles =
      fileEntries.filter((file) =>
        isWorkflowFile(file.path)
      )

    const issueTemplateFiles =
      fileEntries.filter((file) =>
        isIssueTemplateFile(file.path)
      )

    const pullRequestTemplates =
      fileEntries.filter((file) =>
        isPullRequestTemplate(file.path)
      )

    const communityHealthFiles =
      fileEntries.filter((file) =>
        isCommunityHealthFile(file.path)
      )

    const securityConfigFiles =
      fileEntries.filter((file) =>
        isSecurityConfigFile(file.path)
      )

    const codeownersFiles =
      fileEntries.filter((file) =>
        isCodeownersFile(file.path)
      )

    const githubEntries =
      fileEntries.filter((file) =>
        isGitHubDirectory(file.path)
      )

    const githubDirectories =
      directoryEntries.filter((entry) =>
        isGitHubDirectory(entry.path)
      )

    const findings: Finding[] = []

    if (
      workflowFiles.length === 0
    ) {
      findings.push({
        id: "github-config-no-workflows",
        category: "GitHub Practices",
        severity: "medium",
        title:
          "No GitHub Actions workflows detected",
        description:
          "No YAML workflow files were detected under .github/workflows.",
        confidence: 0.95,
        recommendation:
          "Consider adding GitHub Actions for automated checks such as tests, linting, builds, or other project-specific validation.",
      })
    }

    if (
      issueTemplateFiles.length === 0
    ) {
      findings.push({
        id: "github-config-no-issue-templates",
        category: "GitHub Practices",
        severity: "low",
        title:
          "No issue templates detected",
        description:
          "No files were detected under the recognized GitHub issue-template directories.",
        confidence: 0.9,
        recommendation:
          "Consider adding issue templates to help contributors provide reproducible and actionable bug reports or feature requests.",
      })
    }

    if (
      pullRequestTemplates.length === 0
    ) {
      findings.push({
        id: "github-config-no-pr-template",
        category: "GitHub Practices",
        severity: "low",
        title:
          "No pull request template detected",
        description:
          "No recognized pull request template was found under .github.",
        confidence: 0.9,
        recommendation:
          "Consider adding a pull request template covering context, testing, review notes, and relevant project checks.",
      })
    }

    if (
      codeownersFiles.length === 0
    ) {
      findings.push({
        id: "github-config-no-codeowners",
        category: "GitHub Practices",
        severity: "info",
        title:
          "CODEOWNERS file not detected",
        description:
          "No CODEOWNERS file was found at a recognized repository location.",
        confidence: 0.9,
        recommendation:
          "Consider adding CODEOWNERS when explicit ownership and automatic reviewer assignment are useful for the project.",
      })
    }

    if (
      securityConfigFiles.length === 0
    ) {
      findings.push({
        id: "github-config-no-security-automation",
        category: "GitHub Practices",
        severity: "info",
        title:
          "No recognized GitHub security configuration detected",
        description:
          "No Dependabot or CodeQL configuration file from the analyzer's supported paths was found.",
        confidence: 0.85,
        recommendation:
          "Consider enabling appropriate dependency or code-security automation when it matches the project's technology stack.",
      })
    }

    if (
      communityHealthFiles.length === 0
    ) {
      findings.push({
        id: "github-config-no-community-health-files",
        category: "GitHub Practices",
        severity: "info",
        title:
          "No recognized GitHub community-health files detected",
        description:
          "No recognized contribution, conduct, security, support, or funding file was found under .github.",
        confidence: 0.8,
        recommendation:
          "Add relevant community-health files when the project accepts external contributions or needs explicit contributor guidance.",
      })
    }

    if (
      githubEntries.length === 0 &&
      githubDirectories.length === 0
    ) {
      findings.push({
        id: "github-config-no-github-directory",
        category: "GitHub Practices",
        severity: "medium",
        title:
          "No .github directory detected",
        description:
          "The repository tree does not contain a .github directory.",
        confidence: 1,
        recommendation:
          "Consider using .github for repository-level workflows, templates, ownership rules, and GitHub-specific automation.",
      })
    }

    const metrics = {
      workflowFileCount:
        workflowFiles.length,
      issueTemplateFileCount:
        issueTemplateFiles.length,
      pullRequestTemplateCount:
        pullRequestTemplates.length,
      codeownersFileCount:
        codeownersFiles.length,
      securityConfigFileCount:
        securityConfigFiles.length,
      communityHealthFileCount:
        communityHealthFiles.length,
      githubFileCount:
        githubEntries.length,
      githubDirectoryCount:
        githubDirectories.length,
      hasGitHubDirectory:
        githubEntries.length > 0 ||
        githubDirectories.length > 0,
      hasWorkflows:
        workflowFiles.length > 0,
      hasIssueTemplates:
        issueTemplateFiles.length > 0,
      hasPullRequestTemplate:
        pullRequestTemplates.length > 0,
      hasCodeowners:
        codeownersFiles.length > 0,
      hasSecurityConfiguration:
        securityConfigFiles.length > 0,
      hasCommunityHealthFiles:
        communityHealthFiles.length > 0,
      analysisLimited:
        context.tree.analysisLimited,
      analysisExcludedFileCount:
        context.tree.analysisExcludedFileCount,
      treeTruncated:
        context.tree.truncated,
    }

    return {
      analyzer: "GitHub Config Analyzer",
      category: "GitHub Practices",
      score: 0,
      findings,
      metrics,
      recommendations: [],
    }
  },
}