import { describe, expect, it } from "vitest"
import type { AnalyzerContext } from "../analyzer/context"
import { testingAnalyzer } from "./testing"

function createContext(
  paths: Array<{
    path: string
    type?: "file" | "directory"
  }> = [],
  options: {
    analysisLimited?: boolean
    truncated?: boolean
  } = {}
): AnalyzerContext {
  return {
    repository: {
      owner: "test-owner",
      name: "test-repository",
      fullName: "test-owner/test-repository",
      description: null,
      url: "https://github.com/test-owner/test-repository",
      defaultBranch: "main",
      stars: 0,
      forks: 0,
      openIssues: 0,
      language: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      pushedAt: "2024-01-01T00:00:00Z",
      archived: false,
      isFork: false,
    },
    tree: {
      files: paths.map((entry) => ({
        path: entry.path,
        type: entry.type ?? "file",
        size: 100,
      })),
      totalFiles: paths.filter(
        (entry) => (entry.type ?? "file") === "file"
      ).length,
      totalDirectories: paths.filter(
        (entry) => entry.type === "directory"
      ).length,
      analysisLimited: options.analysisLimited ?? false,
      truncated: options.truncated ?? false,
    },
  } as unknown as AnalyzerContext
}

async function analyze(
  paths: Array<{
    path: string
    type?: "file" | "directory"
  }> = [],
  options: {
    analysisLimited?: boolean
    truncated?: boolean
  } = {}
) {
  return testingAnalyzer.analyze(createContext(paths, options))
}

describe("testingAnalyzer", () => {
  it("reports when no recognizable test files exist", async () => {
    const result = await analyze([
      { path: "src/index.ts" },
      { path: "README.md" },
    ])

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "testing-no-test-files-detected",
        severity: "medium",
      })
    )
    expect(result.metrics).toMatchObject({
      detectedTestFiles: 0,
      hasRecognizedTestFiles: false,
    })
  })

  it.each([
    "src/app.test.ts",
    "src/app.spec.tsx",
    "__tests__/app.js",
    "src/test_parser.py",
    "src/parser_test.go",
    "src/parser_test.rs",
  ])("recognizes test file convention: %s", async (path) => {
    const result = await analyze([{ path }])

    expect(result.metrics).toMatchObject({
      detectedTestFiles: 1,
      hasRecognizedTestFiles: true,
    })
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "testing-no-test-files-detected",
      })
    )
  })

  it("recognizes Windows-style path separators", async () => {
    const result = await analyze([
      { path: "src\\__tests__\\app.js" },
    ])

    expect(result.metrics).toMatchObject({
      detectedTestFiles: 1,
      hasRecognizedTestFiles: true,
    })
  })

  it("recognizes test configuration files case-insensitively", async () => {
    const result = await analyze([
      { path: "src/app.test.ts" },
      { path: "JEST.CONFIG.JS" },
    ])

    expect(result.metrics).toMatchObject({
      detectedTestFiles: 1,
      detectedTestConfigFiles: 1,
      hasRecognizedTestConfiguration: true,
    })
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "testing-no-config-detected",
      })
    )
  })

  it.each([
    "jest.config.ts",
    "vitest.config.mts",
    "playwright.config.ts",
    "cypress.config.js",
    "pytest.ini",
    "tox.ini",
    "phpunit.xml",
    "karma.conf.js",
  ])("recognizes supported configuration: %s", async (path) => {
    const result = await analyze([
      { path: "src/app.test.ts" },
      { path },
    ])

    expect(result.metrics).toMatchObject({
      detectedTestConfigFiles: 1,
      hasRecognizedTestConfiguration: true,
    })
  })

  it("reports missing recognized configuration when tests exist", async () => {
    const result = await analyze([
      { path: "src/app.test.ts" },
    ])

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "testing-no-config-detected",
        severity: "info",
      })
    )
  })

  it("does not report missing configuration when no tests exist", async () => {
    const result = await analyze([
      { path: "src/index.ts" },
    ])

    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "testing-no-config-detected",
      })
    )
  })

  it("detects test directories without recognized test files", async () => {
    const result = await analyze([
      { path: "tests", type: "directory" },
      { path: "spec", type: "directory" },
      { path: "tests/helper.js" },
    ])

    expect(result.metrics).toMatchObject({
      detectedTestFiles: 0,
      detectedTestDirectories: 2,
    })
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "testing-test-directories-without-recognized-files",
        severity: "info",
      })
    )
  })

  it("does not flag test directories when recognizable tests exist", async () => {
    const result = await analyze([
      { path: "tests", type: "directory" },
      { path: "tests/app.test.ts" },
    ])

    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "testing-test-directories-without-recognized-files",
      })
    )
  })

  it("ignores directories when counting test files and configurations", async () => {
    const result = await analyze([
      { path: "tests", type: "directory" },
      { path: "jest.config.js", type: "directory" },
    ])

    expect(result.metrics).toMatchObject({
      detectedTestFiles: 0,
      detectedTestConfigFiles: 0,
    })
  })

  it("preserves tree analysis limitation metadata", async () => {
    const result = await analyze(
      [{ path: "src/app.test.ts" }],
      { analysisLimited: true, truncated: true }
    )

    expect(result.metrics).toMatchObject({
      analysisLimited: true,
      treeTruncated: true,
    })
  })

  it("returns the expected analyzer result structure", async () => {
    const result = await analyze([{ path: "src/app.test.ts" }])

    expect(result).toMatchObject({
      analyzer: "Testing Analyzer",
      category: "Testing",
      score: 0,
      findings: expect.any(Array),
      metrics: expect.any(Object),
      recommendations: [],
    })
  })
})