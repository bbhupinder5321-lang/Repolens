import type { Analyzer } from "@/lib/analyzer/analyzer"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type {
  AnalysisResult,
  Finding,
} from "@/lib/analyzer/types"

const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".kt",
  ".kts",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".swift",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".scala",
  ".sh",
])

const TEST_FILE_PATTERNS = [
  /\.test\.[^.]+$/i,
  /\.spec\.[^.]+$/i,
  /(^|\/)__tests__\/[^/]+$/i,
  /(^|\/)test_[^/]+\.py$/i,
  /(^|\/)[^/]+_test\.go$/i,
  /(^|\/)[^/]+_test\.rs$/i,
]

const DOCUMENTATION_FILE_NAMES = new Set([
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
])

const CONFIGURATION_FILE_NAMES = new Set([
  ".editorconfig",
  ".gitignore",
  ".npmrc",
  ".nvmrc",
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "tsconfig.json",
  "jsconfig.json",
  "vite.config.js",
  "vite.config.ts",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "webpack.config.js",
  "webpack.config.ts",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
])

const LARGE_SOURCE_FILE_BYTES = 500_000
const VERY_LARGE_SOURCE_FILE_BYTES = 1_000_000
const DEEP_PATH_THRESHOLD = 8
const VERY_DEEP_PATH_THRESHOLD = 12

function getExtension(path: string): string {
  const fileName = path.split("/").pop() ?? ""
  const dotIndex = fileName.lastIndexOf(".")

  if (dotIndex === -1) {
    return ""
  }

  return fileName.slice(dotIndex).toLowerCase()
}

function getFileName(path: string): string {
  return (
    path.split("/").pop() ?? ""
  ).toLowerCase()
}

function isSourceFile(path: string): boolean {
  return SOURCE_EXTENSIONS.has(
    getExtension(path)
  )
}

function isTestFile(path: string): boolean {
  const normalizedPath =
    path.replace(/\\/g, "/")

  return TEST_FILE_PATTERNS.some(
    (pattern) =>
      pattern.test(normalizedPath)
  )
}

function isDocumentationFile(
  path: string
): boolean {
  return DOCUMENTATION_FILE_NAMES.has(
    getFileName(path)
  )
}

function isConfigurationFile(
  path: string
): boolean {
  return CONFIGURATION_FILE_NAMES.has(
    getFileName(path)
  )
}

function getPathDepth(path: string): number {
  return path
    .split("/")
    .filter(Boolean)
    .length
}

export const maintainabilityAnalyzer: Analyzer = {
  name: "Maintainability Analyzer",
  category: "Maintainability",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const fileEntries =
      context.tree.files.filter(
        (file) => file.type === "file"
      )

    const sourceFiles =
      fileEntries.filter((file) =>
        isSourceFile(file.path)
      )

    const testFiles =
      fileEntries.filter((file) =>
        isTestFile(file.path)
      )

    const documentationFiles =
      fileEntries.filter((file) =>
        isDocumentationFile(file.path)
      )

    const configurationFiles =
      fileEntries.filter((file) =>
        isConfigurationFile(file.path)
      )

    const largeSourceFiles =
      sourceFiles.filter(
        (file) =>
          file.size !== null &&
          file.size > LARGE_SOURCE_FILE_BYTES
      )

    const veryLargeSourceFiles =
      sourceFiles.filter(
        (file) =>
          file.size !== null &&
          file.size > VERY_LARGE_SOURCE_FILE_BYTES
      )

    const deepFiles =
      fileEntries.filter(
        (file) =>
          getPathDepth(file.path) >
          DEEP_PATH_THRESHOLD
      )

    const veryDeepFiles =
      fileEntries.filter(
        (file) =>
          getPathDepth(file.path) >
          VERY_DEEP_PATH_THRESHOLD
      )

    const maximumDepth =
      context.tree.files.reduce(
        (maximum, file) =>
          Math.max(
            maximum,
            getPathDepth(file.path)
          ),
        0
      )

    const sourceToTestRatio =
      testFiles.length === 0
        ? sourceFiles.length
        : sourceFiles.length /
          testFiles.length

    const findings: Finding[] = []

    if (
      veryLargeSourceFiles.length > 0
    ) {
      findings.push({
        id: "maintainability-very-large-source-files",
        category: "Maintainability",
        severity: "high",
        title:
          "Very large source files detected",
        description:
          `${veryLargeSourceFiles.length} source file(s) are larger than 1 MB. Files at this size can become difficult to understand, review, test, and modify safely.`,
        file:
          veryLargeSourceFiles[0].path,
        confidence: 1,
        recommendation:
          "Review very large source files and consider separating independent responsibilities into focused modules.",
      })
    } else if (
      largeSourceFiles.length > 0
    ) {
      findings.push({
        id: "maintainability-large-source-files",
        category: "Maintainability",
        severity: "medium",
        title:
          "Large source files detected",
        description:
          `${largeSourceFiles.length} source file(s) are larger than 500 KB. Large modules can increase review and maintenance cost.`,
        file:
          largeSourceFiles[0].path,
        confidence: 1,
        recommendation:
          "Consider splitting unusually large source files around clear responsibilities and stable interfaces.",
      })
    }

    if (
      veryDeepFiles.length > 0
    ) {
      findings.push({
        id: "maintainability-very-deep-paths",
        category: "Maintainability",
        severity: "medium",
        title:
          "Very deep directory paths detected",
        description:
          `${veryDeepFiles.length} file(s) are nested more than ${VERY_DEEP_PATH_THRESHOLD} path segments deep. Deep structures can make navigation and ownership harder to understand.`,
        file:
          veryDeepFiles[0].path,
        confidence: 0.95,
        recommendation:
          "Review deeply nested paths and simplify directory boundaries where the nesting does not represent a meaningful architectural boundary.",
      })
    } else if (
      deepFiles.length > 0
    ) {
      findings.push({
        id: "maintainability-deep-paths",
        category: "Maintainability",
        severity: "low",
        title:
          "Deep directory paths detected",
        description:
          `${deepFiles.length} file(s) are nested more than ${DEEP_PATH_THRESHOLD} path segments deep.`,
        file:
          deepFiles[0].path,
        confidence: 0.9,
        recommendation:
          "Review deep directory structures periodically and keep nesting aligned with meaningful project boundaries.",
      })
    }

    if (
      sourceFiles.length > 0 &&
      testFiles.length === 0
    ) {
      findings.push({
        id: "maintainability-no-recognized-tests",
        category: "Maintainability",
        severity: "medium",
        title:
          "No recognizable test files detected",
        description:
          "Source files were detected, but no files matched the analyzer's supported test naming conventions.",
        confidence: 0.85,
        recommendation:
          "Add automated tests using conventions appropriate for the project's language and framework.",
      })
    }

    if (
      documentationFiles.length === 0 &&
      sourceFiles.length > 0
    ) {
      findings.push({
        id: "maintainability-no-documentation-files",
        category: "Maintainability",
        severity: "low",
        title:
          "No recognized documentation files detected",
        description:
          "Source files were detected, but no recognized documentation files were found in the repository tree.",
        confidence: 0.9,
        recommendation:
          "Add clear project documentation describing purpose, setup, usage, and development workflow.",
      })
    }

    if (
      configurationFiles.length === 0 &&
      sourceFiles.length > 0
    ) {
      findings.push({
        id: "maintainability-no-configuration-files",
        category: "Maintainability",
        severity: "info",
        title:
          "No recognized configuration files detected",
        description:
          "Source files were detected, but no recognized project configuration files were found.",
        confidence: 0.75,
        recommendation:
          "Document important development conventions and configuration when the project benefits from reproducible tooling.",
      })
    }

    if (
      context.tree.analysisLimited
    ) {
      findings.push({
        id: "maintainability-analysis-limited",
        category: "Maintainability",
        severity: "info",
        title:
          "Maintainability analysis is partially bounded",
        description:
          `The repository contains files outside the analyzer's configured analysis limits. ${context.tree.analysisExcludedFileCount} file(s) were excluded from bounded analysis.`,
        confidence: 1,
        recommendation:
          "Treat maintainability signals as repository-level indicators when the analysis is bounded, and review the excluded-file counts before making conclusions.",
      })
    }

    const metrics = {
      sourceFileCount:
        sourceFiles.length,
      testFileCount:
        testFiles.length,
      documentationFileCount:
        documentationFiles.length,
      configurationFileCount:
        configurationFiles.length,
      largeSourceFileCount:
        largeSourceFiles.length,
      veryLargeSourceFileCount:
        veryLargeSourceFiles.length,
      deepFileCount:
        deepFiles.length,
      veryDeepFileCount:
        veryDeepFiles.length,
      maximumDepth,
      sourceToTestRatio:
        Number(
          sourceToTestRatio.toFixed(2)
        ),
      hasRecognizedTests:
        testFiles.length > 0,
      hasDocumentation:
        documentationFiles.length > 0,
      hasConfiguration:
        configurationFiles.length > 0,
      analysisLimited:
        context.tree.analysisLimited,
      analysisExcludedFileCount:
        context.tree.analysisExcludedFileCount,
      treeTruncated:
        context.tree.truncated,
    }

    return {
      analyzer: "Maintainability Analyzer",
      category: "Maintainability",
      score: 0,
      findings,
      metrics,
      recommendations: [],
    }
  },
}