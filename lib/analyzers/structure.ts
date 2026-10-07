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
  /(^|\/)__tests__(\/|$)/i,
  /(^|\/)tests?(\/|$)/i,
]

const DOCUMENTATION_FILE_NAMES = new Set([
  "readme",
  "readme.md",
  "readme.mdx",
  "contributing.md",
  "changelog.md",
  "changes.md",
  "license",
])

const CONFIG_FILE_NAMES = new Set([
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

function getExtension(path: string): string {
  const fileName = path.split("/").pop() ?? ""
  const dotIndex = fileName.lastIndexOf(".")

  if (dotIndex === -1) {
    return ""
  }

  return fileName.slice(dotIndex).toLowerCase()
}

function isSourceFile(path: string): boolean {
  return SOURCE_EXTENSIONS.has(getExtension(path))
}

function isTestFile(path: string): boolean {
  return TEST_FILE_PATTERNS.some((pattern) =>
    pattern.test(path)
  )
}

function isDocumentationFile(path: string): boolean {
  const fileName = (
    path.split("/").pop() ?? ""
  ).toLowerCase()

  return (
    DOCUMENTATION_FILE_NAMES.has(fileName) ||
    fileName.startsWith("readme.")
  )
}

function isConfigurationFile(path: string): boolean {
  const fileName = (
    path.split("/").pop() ?? ""
  ).toLowerCase()

  return CONFIG_FILE_NAMES.has(fileName)
}

function getPathDepth(path: string): number {
  return path.split("/").filter(Boolean).length
}

export const structureAnalyzer: Analyzer = {
  name: "Structure Analyzer",
  category: "Code Structure",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const { files, analysisFiles } = context.tree

    const fileEntries = files.filter(
      (file) => file.type === "file"
    )

    const directoryEntries = files.filter(
      (file) => file.type === "directory"
    )

    const sourceFiles = fileEntries.filter((file) =>
      isSourceFile(file.path)
    )

    const testFiles = fileEntries.filter((file) =>
      isTestFile(file.path)
    )

    const documentationFiles = fileEntries.filter((file) =>
      isDocumentationFile(file.path)
    )

    const configurationFiles = fileEntries.filter((file) =>
      isConfigurationFile(file.path)
    )

    const maximumDepth = files.reduce(
      (maximum, file) =>
        Math.max(maximum, getPathDepth(file.path)),
      0
    )

    const largeSourceFiles = sourceFiles.filter(
      (file) =>
        file.size !== null &&
        file.size > 500_000
    )

    const findings: Finding[] = []

    if (largeSourceFiles.length > 0) {
      findings.push({
        id: "structure-large-source-files",
        category: "Code Structure",
        severity: "medium",
        title: "Large source files detected",
        description: `${largeSourceFiles.length} source file(s) are larger than 500 KB.`,
        confidence: 1,
        recommendation:
          "Consider splitting unusually large source files into smaller, focused modules.",
      })
    }

    if (testFiles.length === 0 && sourceFiles.length > 0) {
      findings.push({
        id: "structure-no-test-files",
        category: "Code Structure",
        severity: "info",
        title: "No test files detected",
        description:
          "No files matching common test naming conventions were found in the repository tree.",
        confidence: 0.9,
        recommendation:
          "Review the repository's testing setup and add automated tests where appropriate.",
      })
    }

    const metrics = {
      totalEntries: files.length,
      totalFiles: fileEntries.length,
      totalDirectories: directoryEntries.length,
      analysisFiles: analysisFiles.length,
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
      documentationFiles: documentationFiles.length,
      configurationFiles: configurationFiles.length,
      maximumDepth,
      largeSourceFiles: largeSourceFiles.length,
      analysisLimited: context.tree.analysisLimited,
      analysisExcludedFileCount:
        context.tree.analysisExcludedFileCount,
      treeTruncated: context.tree.truncated,
    }

    return {
      analyzer: "Structure Analyzer",
      category: "Code Structure",
      score: 0,
      findings,
      metrics,
      recommendations: [],
    }
  },
}