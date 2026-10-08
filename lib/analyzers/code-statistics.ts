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
  const normalizedPath = path.replace(/\\/g, "/")

  return TEST_FILE_PATTERNS.some((pattern) =>
    pattern.test(normalizedPath)
  )
}

function getLanguageFromExtension(
  extension: string
): string {
  const languages: Record<string, string> = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".java": "Java",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".go": "Go",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".c": "C",
    ".h": "C/C++",
    ".cpp": "C++",
    ".hpp": "C++",
    ".cs": "C#",
    ".scala": "Scala",
    ".sh": "Shell",
  }

  return languages[extension] ?? extension
}

function getPathDepth(path: string): number {
  return path
    .split("/")
    .filter(Boolean)
    .length
}

function round(value: number): number {
  return Number(value.toFixed(2))
}

export const codeStatisticsAnalyzer: Analyzer = {
  name: "Code Statistics Analyzer",
  category: "Code Statistics",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const fileEntries = context.tree.files.filter(
      (file) => file.type === "file"
    )

    const sourceFiles = fileEntries.filter((file) =>
      isSourceFile(file.path)
    )

    const testFiles = fileEntries.filter((file) =>
      isTestFile(file.path)
    )

    const sourceFilesWithSize = sourceFiles.filter(
      (file) => file.size !== null
    )

    const totalSourceBytes =
      sourceFilesWithSize.reduce(
        (total, file) => total + (file.size ?? 0),
        0
      )

    const totalRepositoryBytes =
      fileEntries.reduce(
        (total, file) => total + (file.size ?? 0),
        0
      )

    const largestSourceFiles = [...sourceFiles]
      .filter((file) => file.size !== null)
      .sort(
        (a, b) =>
          (b.size ?? 0) - (a.size ?? 0)
      )
      .slice(0, 10)

    const extensionCounts = new Map<
      string,
      number
    >()

    const languageCounts = new Map<
      string,
      number
    >()

    for (const file of sourceFiles) {
      const extension = getExtension(file.path)

      extensionCounts.set(
        extension,
        (extensionCounts.get(extension) ?? 0) + 1
      )

      const language =
        getLanguageFromExtension(extension)

      languageCounts.set(
        language,
        (languageCounts.get(language) ?? 0) + 1
      )
    }

    const sortedLanguages = [...languageCounts.entries()]
      .sort((a, b) => b[1] - a[1])

    const sortedExtensions = [...extensionCounts.entries()]
      .sort((a, b) => b[1] - a[1])

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
        : sourceFiles.length / testFiles.length

    const findings: Finding[] = []

    if (sourceFiles.length === 0) {
      findings.push({
        id: "code-statistics-no-source-files",
        category: "Code Statistics",
        severity: "info",
        title: "No recognized source files detected",
        description:
          "The repository tree contains no files using the analyzer's supported source-code extensions.",
        confidence: 0.95,
        recommendation:
          "Review the repository's technology stack if source files use an extension that is not currently recognized.",
      })
    }

    if (
      sourceFiles.length > 0 &&
      testFiles.length === 0
    ) {
      findings.push({
        id: "code-statistics-no-tests",
        category: "Code Statistics",
        severity: "info",
        title: "No recognized test files detected",
        description:
          "Source files were detected, but no files matched the analyzer's supported test naming conventions.",
        confidence: 0.85,
        recommendation:
          "Review the project's testing strategy and add automated tests where appropriate.",
      })
    }

    if (
      sourceFiles.length > 0 &&
      sourceToTestRatio > 20
    ) {
      findings.push({
        id: "code-statistics-low-test-density",
        category: "Code Statistics",
        severity: "low",
        title: "Low recognized test-file density",
        description:
          `The repository contains approximately ${round(sourceToTestRatio)} source files per recognized test file.`,
        confidence: 0.75,
        recommendation:
          "Review test coverage and test organization. A low test-file ratio does not prove inadequate coverage, but it is useful as a structural signal.",
      })
    }

    if (context.tree.analysisLimited) {
      findings.push({
        id: "code-statistics-analysis-limited",
        category: "Code Statistics",
        severity: "info",
        title: "Code statistics are partially bounded",
        description:
          `${context.tree.analysisExcludedFileCount} file(s) were excluded from bounded analysis because of configured analysis limits.`,
        confidence: 1,
        recommendation:
          "Interpret repository-wide statistics in the context of the reported analysis limits.",
      })
    }

    const metrics = {
      totalRepositoryFiles: fileEntries.length,
      sourceFileCount: sourceFiles.length,
      testFileCount: testFiles.length,
      totalSourceBytes,
      totalSourceMegabytes: round(
        totalSourceBytes / 1_000_000
      ),
      totalRepositoryBytes,
      totalRepositoryMegabytes: round(
        totalRepositoryBytes / 1_000_000
      ),
      sourceToTestRatio: round(
        sourceToTestRatio
      ),
      languageCount: sortedLanguages.length,
      extensionCount: sortedExtensions.length,
      topLanguage:
        sortedLanguages[0]?.[0] ?? null,
      topLanguageFileCount:
        sortedLanguages[0]?.[1] ?? 0,
      maximumDepth,
      largestSourceFile:
        largestSourceFiles[0]?.path ?? null,
      largestSourceFileBytes:
        largestSourceFiles[0]?.size ?? 0,
      analysisLimited:
        context.tree.analysisLimited,
      analysisExcludedFileCount:
        context.tree.analysisExcludedFileCount,
      treeTruncated:
        context.tree.truncated,
    }

    const recommendations = [
      ...(sortedLanguages.length > 0
        ? [
            `Primary detected language: ${sortedLanguages[0][0]} (${sortedLanguages[0][1]} source file(s)).`,
          ]
        : []),
      ...(largestSourceFiles.length > 0
        ? [
            `Largest detected source file: ${largestSourceFiles[0].path}.`,
          ]
        : []),
    ]

    return {
      analyzer: "Code Statistics Analyzer",
      category: "Code Statistics",
      score: 0,
      findings,
      metrics,
      recommendations,
    }
  },
}