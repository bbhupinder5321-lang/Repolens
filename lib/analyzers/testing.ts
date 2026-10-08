import type { Analyzer } from "@/lib/analyzer/analyzer"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type {
  AnalysisResult,
  Finding,
} from "@/lib/analyzer/types"

const TEST_FILE_PATTERNS = [
  /(^|\/)__tests__\/[^/]+$/i,
  /\.(test|spec)\.[^.]+$/i,
  /(^|\/)test_[^/]+\.py$/i,
  /(^|\/)[^/]+_test\.go$/i,
  /(^|\/)[^/]+_test\.rs$/i,
]

const TEST_DIRECTORY_NAMES = new Set([
  "__tests__",
  "test",
  "tests",
  "spec",
  "specs",
])

const TEST_CONFIG_FILE_NAMES = new Set([
  "jest.config.js",
  "jest.config.ts",
  "jest.config.mjs",
  "jest.config.cjs",
  "vitest.config.js",
  "vitest.config.ts",
  "vitest.config.mjs",
  "vitest.config.mts",
  "playwright.config.js",
  "playwright.config.ts",
  "cypress.config.js",
  "cypress.config.ts",
  "pytest.ini",
  "tox.ini",
  "phpunit.xml",
  "karma.conf.js",
])

function getFileName(path: string): string {
  return (path.split("/").pop() ?? "").toLowerCase()
}

function isTestFile(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/")

  return TEST_FILE_PATTERNS.some((pattern) =>
    pattern.test(normalizedPath)
  )
}

function isTestDirectory(path: string): boolean {
  const normalizedPath = path
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")

  const segments = normalizedPath.split("/")

  return segments.some((segment) =>
    TEST_DIRECTORY_NAMES.has(segment.toLowerCase())
  )
}

function isTestConfigFile(path: string): boolean {
  return TEST_CONFIG_FILE_NAMES.has(getFileName(path))
}

export const testingAnalyzer: Analyzer = {
  name: "Testing Analyzer",
  category: "Testing",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const fileEntries = context.tree.files.filter(
      (file) => file.type === "file"
    )

    const directoryEntries = context.tree.files.filter(
      (file) => file.type === "directory"
    )

    const testFiles = fileEntries.filter((file) =>
      isTestFile(file.path)
    )

    const testDirectories = directoryEntries.filter((entry) =>
      isTestDirectory(entry.path)
    )

    const testConfigFiles = fileEntries.filter((file) =>
      isTestConfigFile(file.path)
    )

    const findings: Finding[] = []

    if (testFiles.length === 0) {
      findings.push({
        id: "testing-no-test-files-detected",
        category: "Testing",
        severity: "medium",
        title: "No recognizable test files detected",
        description:
          "The repository tree contains no files matching the analyzer's supported test naming conventions. Tests may still exist under other naming patterns.",
        confidence: 0.85,
        recommendation:
          "Review the project's testing approach and add automated tests using conventions appropriate for its language and framework.",
      })
    }

    if (
      testFiles.length > 0 &&
      testConfigFiles.length === 0
    ) {
      findings.push({
        id: "testing-no-config-detected",
        category: "Testing",
        severity: "info",
        title: "No recognized test configuration detected",
        description:
          "Test-like files were found, but no configuration file from the analyzer's supported list was detected. Some test frameworks work without a dedicated configuration file.",
        confidence: 0.8,
        recommendation:
          "Verify that the project's test runner is configured and that contributors can discover how to run the tests.",
      })
    }

    if (
      testFiles.length === 0 &&
      testDirectories.length > 0
    ) {
      findings.push({
        id: "testing-test-directories-without-recognized-files",
        category: "Testing",
        severity: "info",
        title: "Test directories detected",
        description:
          `${testDirectories.length} test-related director${testDirectories.length === 1 ? "y" : "ies"} were detected, but their files did not match the analyzer's supported test naming conventions.`,
        confidence: 0.75,
        recommendation:
          "Review the contents of the test directories to confirm that the project's test files use recognizable naming conventions.",
      })
    }

    const metrics = {
      detectedTestFiles: testFiles.length,
      detectedTestDirectories: testDirectories.length,
      detectedTestConfigFiles: testConfigFiles.length,
      hasRecognizedTestFiles: testFiles.length > 0,
      hasRecognizedTestConfiguration:
        testConfigFiles.length > 0,
      analysisLimited: context.tree.analysisLimited,
      treeTruncated: context.tree.truncated,
    }

    return {
      analyzer: "Testing Analyzer",
      category: "Testing",
      score: 0,
      findings,
      metrics,
      recommendations: [],
    }
  },
}