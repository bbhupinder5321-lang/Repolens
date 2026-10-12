
import { describe, expect, it } from "vitest"
import type { AnalyzerContext } from "../analyzer/context"
import { dependencyAnalyzer } from "./dependency"

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
  return dependencyAnalyzer.analyze(createContext(paths, options))
}

describe("dependencyAnalyzer", () => {
  it("reports when no supported dependency manifests exist", async () => {
    const result = await analyze([
      { path: "README.md" },
      { path: "src/index.ts" },
    ])

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "dependency-no-manifest-detected",
        severity: "info",
      })
    )
    expect(result.metrics).toMatchObject({
      dependencyManifestCount: 0,
      hasDependencyManifest: false,
      hasRootDependencyManifest: false,
    })
  })

  it.each([
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "Pipfile",
    "Gemfile",
    "go.mod",
    "Cargo.toml",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "composer.json",
  ])("recognizes manifest: %s", async (path) => {
    const result = await analyze([{ path }])

    expect(result.metrics).toMatchObject({
      dependencyManifestCount: 1,
      rootDependencyManifestCount: 1,
      nestedDependencyManifestCount: 0,
      hasDependencyManifest: true,
      hasRootDependencyManifest: true,
    })
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "dependency-no-manifest-detected",
      })
    )
  })

  it("recognizes manifest names case-insensitively", async () => {
    const result = await analyze([
      { path: "PACKAGE.JSON" },
    ])

    expect(result.metrics).toMatchObject({
      dependencyManifestCount: 1,
      hasRootDependencyManifest: true,
    })
  })

  it("recognizes nested manifests and reports no root manifest", async () => {
    const result = await analyze([
      { path: "packages/web/package.json" },
      { path: "packages/api/requirements.txt" },
    ])

    expect(result.metrics).toMatchObject({
      dependencyManifestCount: 2,
      rootDependencyManifestCount: 0,
      nestedDependencyManifestCount: 2,
      hasDependencyManifest: true,
      hasRootDependencyManifest: false,
    })
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "dependency-no-root-manifest",
      })
    )
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "dependency-nested-manifests-detected",
      })
    )
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "dependency-no-manifest-detected",
      })
    )
  })

  it("does not count directories as manifests or lockfiles", async () => {
    const result = await analyze([
      { path: "package.json", type: "directory" },
      { path: "package-lock.json", type: "directory" },
    ])

    expect(result.metrics).toMatchObject({
      dependencyManifestCount: 0,
      detectedLockFileCount: 0,
    })
  })

  it("reports a missing required root npm lockfile", async () => {
    const result = await analyze([
      { path: "package.json" },
    ])

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "dependency-missing-root-lockfile-package.json",
        severity: "medium",
        file: "package.json",
      })
    )
    expect(result.metrics).toMatchObject({
      missingRequiredRootLockfiles: 1,
    })
  })

  it.each([
    ["package.json", "package-lock.json"],
    ["package.json", "npm-shrinkwrap.json"],
    ["package.json", "yarn.lock"],
    ["package.json", "pnpm-lock.yaml"],
    ["package.json", "bun.lock"],
    ["package.json", "bun.lockb"],
    ["Pipfile", "Pipfile.lock"],
    ["Gemfile", "Gemfile.lock"],
    ["go.mod", "go.sum"],
    ["composer.json", "composer.lock"],
  ])(
    "accepts %s with matching lockfile %s",
    async (manifest, lockfile) => {
      const result = await analyze([
        { path: manifest },
        { path: lockfile },
      ])

      expect(result.metrics.missingRequiredRootLockfiles).toBe(0)
      expect(result.findings).not.toContainEqual(
        expect.objectContaining({
          id: `dependency-missing-root-lockfile-${manifest.toLowerCase()}`,
        })
      )
    }
  )

  it("does not treat a lockfile in another directory as a root lockfile", async () => {
    const result = await analyze([
      { path: "package.json" },
      { path: "packages/web/package-lock.json" },
    ])

    expect(result.metrics.missingRequiredRootLockfiles).toBe(1)
  })

  it("does not treat a different ecosystem's lockfile as a match", async () => {
    const result = await analyze([
      { path: "package.json" },
      { path: "Cargo.lock" },
    ])

    expect(result.metrics.missingRequiredRootLockfiles).toBe(1)
  })

  it("does not require a lockfile for requirements.txt", async () => {
    const result = await analyze([
      { path: "requirements.txt" },
    ])

    expect(result.metrics).toMatchObject({
      missingRequiredRootLockfiles: 0,
    })
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "dependency-missing-root-lockfile-requirements.txt",
      })
    )
  })

  it("does not require a lockfile for Cargo.toml", async () => {
    const result = await analyze([
      { path: "Cargo.toml" },
    ])

    expect(result.metrics.missingRequiredRootLockfiles).toBe(0)
  })

  it("recognizes optional Python lockfiles", async () => {
    const result = await analyze([
      { path: "pyproject.toml" },
      { path: "poetry.lock" },
      { path: "uv.lock" },
      { path: "pdm.lock" },
    ])

    expect(result.metrics).toMatchObject({
      dependencyManifestCount: 1,
      detectedLockFileCount: 3,
      missingRequiredRootLockfiles: 0,
    })
  })

  it("detects multiple root ecosystems", async () => {
    const result = await analyze([
      { path: "package.json" },
      { path: "requirements.txt" },
    ])

    expect(result.metrics).toMatchObject({
      rootEcosystemCount: 2,
      rootEcosystems: "Node.js, Python",
    })
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "dependency-multiple-root-ecosystems",
      })
    )
  })

  it("counts distinct manifest types separately from manifest files", async () => {
    const result = await analyze([
      { path: "package.json" },
      { path: "packages/web/package.json" },
      { path: "requirements.txt" },
    ])

    expect(result.metrics).toMatchObject({
      dependencyManifestCount: 3,
      dependencyManifestTypes: 2,
      rootDependencyManifestCount: 2,
      nestedDependencyManifestCount: 1,
    })
  })

  it("detects package manager configuration files", async () => {
    const result = await analyze([
      { path: ".npmrc" },
      { path: ".yarnrc" },
      { path: ".yarnrc.yml" },
      { path: ".pnpmfile.cjs" },
      { path: "pnpm-workspace.yaml" },
      { path: "bunfig.toml" },
    ])

    expect(result.metrics.detectedPackageManagerFileCount).toBe(6)
  })

  it("preserves partial-analysis metadata", async () => {
    const result = await analyze(
      [{ path: "package.json" }],
      { analysisLimited: true, truncated: true }
    )

    expect(result.metrics).toMatchObject({
      analysisLimited: true,
      treeTruncated: true,
    })
  })

  it("returns the expected result structure", async () => {
    const result = await analyze([
      { path: "package.json" },
      { path: "package-lock.json" },
    ])

    expect(result).toMatchObject({
      analyzer: "Dependency Analyzer",
      category: "Dependencies",
      score: 0,
      findings: expect.any(Array),
      metrics: expect.any(Object),
      recommendations: [],
    })
  })

  it("does not report a missing lockfile when the repository tree is truncated", async () => {
    const result = await analyze(
      [{ path: "package.json" }],
      { truncated: true }
    )

    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        id: "dependency-missing-root-lockfile-package.json",
      })
    )
  })

  it("still checks lockfiles when analysis is limited but the file list is available", async () => {
    const result = await analyze(
      [{ path: "package.json" }],
      { analysisLimited: true }
    )

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        id: "dependency-missing-root-lockfile-package.json",
        severity: "medium",
      })
    )
  })
})
