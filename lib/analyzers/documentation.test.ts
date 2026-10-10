import { describe, expect, it } from "vitest"
import { documentationAnalyzer } from "./documentation"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type { RepositoryMetadata } from "@/lib/github/repository"
import type {
  RepositoryFile,
  RepositoryTree,
} from "@/lib/github/tree"

function createFile(path: string): RepositoryFile {
  return {
    path,
    type: "file",
    size: 100,
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

function createContext(paths: string[]): AnalyzerContext {
  const files = paths.map(createFile)

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
    analysisFiles: files,
    analysisLimited: false,
    analysisExcludedFileCount: 0,
    analysisExcludedByFileCount: 0,
    analysisExcludedBySize: 0,
    truncated: false,
  }

  return { repository, tree }
}

async function analyze(paths: string[]) {
  return documentationAnalyzer.analyze(createContext(paths))
}

describe("Documentation Analyzer", () => {
  it("reports all five documentation findings when no files exist", async () => {
    const result = await analyze([])

    expect(result.findings.map((finding) => finding.id)).toEqual([
      "documentation-missing-readme",
      "documentation-missing-contributing",
      "documentation-missing-security-policy",
      "documentation-missing-changelog",
      "documentation-missing-license",
    ])

    expect(result.metrics.documentationFileCount).toBe(0)
    expect(result.metrics.hasReadme).toBe(false)
    expect(result.metrics.hasContributing).toBe(false)
    expect(result.metrics.hasSecurityPolicy).toBe(false)
    expect(result.metrics.hasChangelog).toBe(false)
    expect(result.metrics.hasLicense).toBe(false)
  })

  it("detects the standard documentation files", async () => {
    const result = await analyze([
      "README.md",
      "CONTRIBUTING.md",
      "SECURITY.md",
      "CHANGELOG.md",
      "LICENSE",
    ])

    expect(result.findings).toEqual([])
    expect(result.metrics.documentationFileCount).toBe(5)
    expect(result.metrics.hasReadme).toBe(true)
    expect(result.metrics.hasContributing).toBe(true)
    expect(result.metrics.hasSecurityPolicy).toBe(true)
    expect(result.metrics.hasChangelog).toBe(true)
    expect(result.metrics.hasLicense).toBe(true)
  })

  it("matches documentation filenames without regard to case", async () => {
    const result = await analyze([
      "ReadMe.MD",
      "Contributing.MD",
      "Security.MD",
      "Changelog.MD",
      "License.TXT",
    ])

    expect(result.metrics.hasReadme).toBe(true)
    expect(result.metrics.hasContributing).toBe(true)
    expect(result.metrics.hasSecurityPolicy).toBe(true)
    expect(result.metrics.hasChangelog).toBe(true)
    expect(result.metrics.hasLicense).toBe(true)
    expect(result.findings).toEqual([])
  })

  it("recognizes supported README and changelog alternatives", async () => {
    const result = await analyze([
      "README.mdx",
      "changes.md",
      "license.md",
      "contributing",
      "security",
    ])

    expect(result.metrics.hasReadme).toBe(true)
    expect(result.metrics.hasChangelog).toBe(true)
    expect(result.metrics.hasLicense).toBe(true)
    expect(result.metrics.hasContributing).toBe(true)
    expect(result.metrics.hasSecurityPolicy).toBe(true)
    expect(result.findings).toEqual([])
  })

  it("detects documentation files inside subdirectories", async () => {
    const result = await analyze([
      "docs/README.md",
      "guides/CONTRIBUTING.md",
      "policies/SECURITY.md",
      "release/CHANGELOG.md",
      "legal/LICENSE",
    ])

    expect(result.metrics.hasReadme).toBe(true)
    expect(result.metrics.hasContributing).toBe(true)
    expect(result.metrics.hasSecurityPolicy).toBe(true)
    expect(result.metrics.hasChangelog).toBe(true)
    expect(result.metrics.hasLicense).toBe(true)
    expect(result.findings).toEqual([])
  })

  it("counts supported documentation files and excludes unrelated files", async () => {
    const result = await analyze([
      "README.md",
      "CONTRIBUTING.md",
      "SECURITY.md",
      "CHANGELOG.md",
      "LICENSE",
      "docs/README.txt",
      "docs/changes.md",
      "src/index.ts",
      "notes.txt",
      "docs/architecture.md",
    ])

    expect(result.metrics.documentationFileCount).toBe(7)
  })

  it("does not mistake unrelated filenames for documentation", async () => {
    const result = await analyze([
      "README-backup.md",
      "MY_LICENSE",
      "SECURITY-NOTES.md",
      "CHANGELOG-old.md",
      "CONTRIBUTING-GUIDE.md",
    ])

    expect(result.metrics.hasReadme).toBe(false)
    expect(result.metrics.hasContributing).toBe(false)
    expect(result.metrics.hasSecurityPolicy).toBe(false)
    expect(result.metrics.hasChangelog).toBe(false)
    expect(result.metrics.hasLicense).toBe(false)
    expect(result.metrics.documentationFileCount).toBe(0)
  })

  it("ignores directory entries when detecting documentation", async () => {
    const context = createContext([
      "src/index.ts",
    ])

    context.tree.files.push(
      createDirectory("README.md"),
      createDirectory("CONTRIBUTING.md"),
      createDirectory("SECURITY.md"),
      createDirectory("CHANGELOG.md"),
      createDirectory("LICENSE"),
    )

    const result = await documentationAnalyzer.analyze(context)

    expect(result.metrics.hasReadme).toBe(false)
    expect(result.metrics.hasContributing).toBe(false)
    expect(result.metrics.hasSecurityPolicy).toBe(false)
    expect(result.metrics.hasChangelog).toBe(false)
    expect(result.metrics.hasLicense).toBe(false)
    expect(result.metrics.documentationFileCount).toBe(0)
  })

  it("returns the expected analyzer identity and result structure", async () => {
    const result = await analyze(["README.md"])

    expect(result.analyzer).toBe("Documentation Analyzer")
    expect(result.category).toBe("Documentation")
    expect(result.score).toBe(0)
    expect(Array.isArray(result.findings)).toBe(true)
    expect(Array.isArray(result.recommendations)).toBe(true)
    expect(result.recommendations).toEqual([])
  })
})