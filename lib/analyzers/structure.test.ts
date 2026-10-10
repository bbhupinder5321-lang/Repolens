import { describe, expect, it } from "vitest"
import { structureAnalyzer } from "./structure"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type { RepositoryMetadata } from "@/lib/github/repository"
import type {
  RepositoryFile,
  RepositoryTree,
} from "@/lib/github/tree"

function createFile(
  path: string,
  size: number | null = 100
): RepositoryFile {
  return {
    path,
    type: "file",
    size,
    sha: `sha-${path}`,
  }
}

function createDirectory(path: string): RepositoryFile {
  return {
    path,
    type: "directory",
    size: null,
    sha: `sha-${path}`,
  }
}

function createContext(
  paths: string[],
  options: {
    directories?: string[]
    analysisPaths?: string[]
    limited?: boolean
    excludedCount?: number
    truncated?: boolean
    sizes?: Record<string, number | null>
  } = {}
): AnalyzerContext {
  const files = [
    ...paths.map((path) =>
      createFile(path, options.sizes?.[path] ?? 100)
    ),
    ...(options.directories ?? []).map(createDirectory),
  ]

  const analysisFiles = (options.analysisPaths ?? paths).map(
    (path) => files.find(
      (file) => file.path === path && file.type === "file"
    )!
  )

  const repository: RepositoryMetadata = {
    requestedOwner: "test-owner",
    requestedName: "test-repo",
    owner: "test-owner",
    name: "test-repo",
    fullName: "test-owner/test-repo",
    description: "Test repository",
    htmlUrl: "https://github.com/test-owner/test-repo",
    defaultBranch: "main",
    stars: 10,
    forks: 2,
    openIssues: 1,
    watchers: 5,
    language: "TypeScript",
    sizeKb: 100,
    isPrivate: false,
    isArchived: false,
    isFork: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    pushedAt: "2026-10-01T00:00:00.000Z",
    license: "MIT",
    topics: [],
  }

  const tree: RepositoryTree = {
    branch: "main",
    files,
    analysisFiles,
    analysisLimited: options.limited ?? false,
    analysisExcludedFileCount: options.excludedCount ?? 0,
    analysisExcludedByFileCount: 0,
    analysisExcludedBySize: 0,
    truncated: options.truncated ?? false,
  }

  return { repository, tree }
}

async function analyze(
  paths: string[],
  options: Parameters<typeof createContext>[1] = {}
) {
  return structureAnalyzer.analyze(createContext(paths, options))
}

describe("Structure Analyzer", () => {
  it("returns zero counts for an empty repository", async () => {
    const result = await analyze([])

    expect(result.metrics.totalEntries).toBe(0)
    expect(result.metrics.totalFiles).toBe(0)
    expect(result.metrics.totalDirectories).toBe(0)
    expect(result.metrics.sourceFiles).toBe(0)
    expect(result.metrics.testFiles).toBe(0)
    expect(result.metrics.maximumDepth).toBe(0)
    expect(result.findings).toEqual([])
  })

  it("recognizes supported source-code extensions case-insensitively", async () => {
    const paths = [
      "src/app.js",
      "src/component.jsx",
      "src/index.ts",
      "src/view.tsx",
      "src/module.mjs",
      "src/legacy.cjs",
      "src/script.py",
      "src/Main.java",
      "src/Worker.kt",
      "src/Worker.kts",
      "src/server.go",
      "src/lib.rs",
      "src/tool.rb",
      "src/index.php",
      "src/App.swift",
      "src/main.c",
      "src/header.h",
      "src/core.cpp",
      "src/core.hpp",
      "src/App.cs",
      "src/Job.scala",
      "scripts/run.sh",
      "assets/logo.png",
      "notes.txt",
    ]

    const result = await analyze(paths)

    expect(result.metrics.sourceFiles).toBe(22)
    expect(result.metrics.totalFiles).toBe(24)
  })

  it("recognizes common test naming conventions", async () => {
    const paths = [
      "src/app.ts",
      "src/app.test.ts",
      "src/view.spec.tsx",
      "src/__tests__/helper.ts",
      "tests/integration.ts",
      "test/legacy.js",
    ]

    const result = await analyze(paths)

    expect(result.metrics.sourceFiles).toBe(6)
    expect(result.metrics.testFiles).toBe(5)
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "structure-no-test-files",
      })
    )
  })

  it("reports missing tests when source files exist without test matches", async () => {
    const result = await analyze([
      "src/app.ts",
      "src/helper.py",
      "README.md",
    ])

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "structure-no-test-files",
        severity: "info",
      })
    )
  })

  it("does not report missing tests when no source files exist", async () => {
    const result = await analyze([
      "README.md",
      "package.json",
      "assets/logo.png",
    ])

    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "structure-no-test-files",
      })
    )
  })

  it("counts documentation and configuration files", async () => {
    const result = await analyze([
      "README.md",
      "docs/README.mdx",
      "CONTRIBUTING.md",
      "CHANGELOG.md",
      "LICENSE",
      ".gitignore",
      ".editorconfig",
      "tsconfig.json",
      "eslint.config.js",
      "src/index.ts",
    ])

    expect(result.metrics.documentationFiles).toBe(5)
    expect(result.metrics.configurationFiles).toBe(4)
  })

  it("counts files and directories separately", async () => {
    const result = await analyze(
      ["src/index.ts", "README.md"],
      {
        directories: ["src", "docs"],
      }
    )

    expect(result.metrics.totalEntries).toBe(4)
    expect(result.metrics.totalFiles).toBe(2)
    expect(result.metrics.totalDirectories).toBe(2)
  })

  it("calculates maximum path depth", async () => {
    const result = await analyze([
      "README.md",
      "src/index.ts",
      "src/features/auth/login.ts",
    ])

    expect(result.metrics.maximumDepth).toBe(4)
  })

  it("flags source files larger than 500 KB", async () => {
    const result = await analyze(
      ["src/large.ts", "src/normal.ts", "assets/archive.bin"],
      {
        sizes: {
          "src/large.ts": 500_001,
          "src/normal.ts": 500_000,
          "assets/archive.bin": 900_000,
        },
      }
    )

    expect(result.metrics.largeSourceFiles).toBe(1)
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "structure-large-source-files",
        severity: "medium",
        description: "1 source file(s) are larger than 500 KB.",
      })
    )
  })

  it("does not flag source files at or below 500 KB", async () => {
    const result = await analyze(
      ["src/exact.ts", "src/small.ts"],
      {
        sizes: {
          "src/exact.ts": 500_000,
          "src/small.ts": 10,
        },
      }
    )

    expect(result.metrics.largeSourceFiles).toBe(0)
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "structure-large-source-files",
      })
    )
  })

  it("does not flag files whose size is unknown", async () => {
    const result = await analyze(
      ["src/unknown.ts"],
      {
        sizes: {
          "src/unknown.ts": null,
        },
      }
    )

    expect(result.metrics.largeSourceFiles).toBe(0)
  })

  it("preserves analysis coverage metadata", async () => {
    const result = await analyze(
      ["src/index.ts", "README.md"],
      {
        analysisPaths: ["src/index.ts"],
        limited: true,
        excludedCount: 7,
        truncated: true,
      }
    )

    expect(result.metrics.analysisFiles).toBe(1)
    expect(result.metrics.analysisLimited).toBe(true)
    expect(result.metrics.analysisExcludedFileCount).toBe(7)
    expect(result.metrics.treeTruncated).toBe(true)
  })

  it("returns the expected analyzer identity and result structure", async () => {
    const result = await analyze(["src/index.ts", "src/index.test.ts"])

    expect(result.analyzer).toBe("Structure Analyzer")
    expect(result.category).toBe("Code Structure")
    expect(result.score).toBe(0)
    expect(Array.isArray(result.findings)).toBe(true)
    expect(Array.isArray(result.recommendations)).toBe(true)
    expect(result.recommendations).toEqual([])
  })
})