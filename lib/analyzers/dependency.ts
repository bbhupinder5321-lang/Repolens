import type { Analyzer } from "@/lib/analyzer/analyzer"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type {
  AnalysisResult,
  Finding,
} from "@/lib/analyzer/types"

interface DependencyManifest {
  fileName: string
  ecosystem: string
  packageManager: string
  lockFiles: string[]
  lockRequired: boolean
}

interface DetectedManifest
  extends DependencyManifest {
  path: string
  directory: string
  isRoot: boolean
}

const DEPENDENCY_MANIFESTS: DependencyManifest[] = [
  {
    fileName: "package.json",
    ecosystem: "Node.js",
    packageManager: "npm",
    lockFiles: [
      "package-lock.json",
      "npm-shrinkwrap.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lock",
      "bun.lockb",
    ],
    lockRequired: true,
  },
  {
    fileName: "requirements.txt",
    ecosystem: "Python",
    packageManager: "pip",
    lockFiles: [],
    lockRequired: false,
  },
  {
    fileName: "pyproject.toml",
    ecosystem: "Python",
    packageManager: "pip/PEP 621",
    lockFiles: [
      "poetry.lock",
      "uv.lock",
      "pdm.lock",
    ],
    lockRequired: false,
  },
  {
    fileName: "Pipfile",
    ecosystem: "Python",
    packageManager: "pipenv",
    lockFiles: ["Pipfile.lock"],
    lockRequired: true,
  },
  {
    fileName: "Gemfile",
    ecosystem: "Ruby",
    packageManager: "Bundler",
    lockFiles: ["Gemfile.lock"],
    lockRequired: true,
  },
  {
    fileName: "go.mod",
    ecosystem: "Go",
    packageManager: "Go modules",
    lockFiles: ["go.sum"],
    lockRequired: true,
  },
  {
    fileName: "Cargo.toml",
    ecosystem: "Rust",
    packageManager: "Cargo",
    lockFiles: ["Cargo.lock"],
    lockRequired: false,
  },
  {
    fileName: "pom.xml",
    ecosystem: "Java",
    packageManager: "Maven",
    lockFiles: [],
    lockRequired: false,
  },
  {
    fileName: "build.gradle",
    ecosystem: "Java",
    packageManager: "Gradle",
    lockFiles: [],
    lockRequired: false,
  },
  {
    fileName: "build.gradle.kts",
    ecosystem: "Kotlin/JVM",
    packageManager: "Gradle",
    lockFiles: [],
    lockRequired: false,
  },
  {
    fileName: "composer.json",
    ecosystem: "PHP",
    packageManager: "Composer",
    lockFiles: ["composer.lock"],
    lockRequired: true,
  },
]

const LOCK_FILES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "poetry.lock",
  "uv.lock",
  "pdm.lock",
  "pipfile.lock",
  "gemfile.lock",
  "go.sum",
  "cargo.lock",
  "composer.lock",
])

const PACKAGE_MANAGER_FILES = new Set([
  ".npmrc",
  ".yarnrc",
  ".yarnrc.yml",
  ".pnpmfile.cjs",
  "pnpm-workspace.yaml",
  "bunfig.toml",
])

function getFileName(path: string): string {
  return (
    path.split("/").pop() ?? ""
  ).toLowerCase()
}

function getDirectory(path: string): string {
  const parts = path.split("/")

  if (parts.length <= 1) {
    return "."
  }

  return parts
    .slice(0, -1)
    .join("/")
}

function findManifestDefinition(
  fileName: string
): DependencyManifest | null {
  return (
    DEPENDENCY_MANIFESTS.find(
      (manifest) =>
        manifest.fileName.toLowerCase() ===
        fileName
    ) ?? null
  )
}

function findDependencyManifests(
  paths: string[]
): DetectedManifest[] {
  const manifests: DetectedManifest[] = []

  for (const path of paths) {
    const fileName = getFileName(path)

    const definition =
      findManifestDefinition(fileName)

    if (!definition) {
      continue
    }

    const directory = getDirectory(path)

    manifests.push({
      ...definition,
      path,
      directory,
      isRoot: directory === ".",
    })
  }

  return manifests
}

function findLockFiles(
  paths: string[]
): string[] {
  return paths.filter((path) =>
    LOCK_FILES.has(getFileName(path))
  )
}

function findPackageManagerFiles(
  paths: string[]
): string[] {
  return paths.filter((path) =>
    PACKAGE_MANAGER_FILES.has(getFileName(path))
  )
}

function hasLockfileNearManifest(
  manifest: DetectedManifest,
  lockFiles: string[]
): boolean {
  if (manifest.lockFiles.length === 0) {
    return true
  }

  return manifest.lockFiles.some(
    (expectedLockFile) =>
      lockFiles.some((lockFile) => {
        const lockDirectory =
          getDirectory(lockFile)

        return (
          lockDirectory === manifest.directory &&
          getFileName(lockFile) ===
            expectedLockFile.toLowerCase()
        )
      })
  )
}

export const dependencyAnalyzer: Analyzer = {
  name: "Dependency Analyzer",
  category: "Dependencies",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const fileEntries =
      context.tree.files.filter(
        (file) => file.type === "file"
      )

    const filePaths = fileEntries.map(
      (file) => file.path
    )

    const detectedManifests =
      findDependencyManifests(filePaths)

    const rootManifests =
      detectedManifests.filter(
        (manifest) => manifest.isRoot
      )

    const nestedManifests =
      detectedManifests.filter(
        (manifest) => !manifest.isRoot
      )

    const detectedLockFiles =
      findLockFiles(filePaths)

    const detectedPackageManagerFiles =
      findPackageManagerFiles(filePaths)

    const rootEcosystems = Array.from(
      new Set(
        rootManifests.map(
          (manifest) => manifest.ecosystem
        )
      )
    )

    const allEcosystems = Array.from(
      new Set(
        detectedManifests.map(
          (manifest) => manifest.ecosystem
        )
      )
    )

    const missingRootLockfiles =
      rootManifests.filter(
        (manifest) =>
          manifest.lockRequired &&
          !hasLockfileNearManifest(
            manifest,
            detectedLockFiles
          )
      )

    const findings: Finding[] = []

    if (
      rootManifests.length === 0 &&
      detectedManifests.length === 0
    ) {
      findings.push({
        id: "dependency-no-manifest-detected",
        category: "Dependencies",
        severity: "info",
        title:
          "No supported dependency manifest detected",
        description:
          "No dependency manifest from the analyzer's supported ecosystem list was found in the repository tree.",
        confidence: 0.9,
        recommendation:
          "If the project uses external dependencies, keep its dependency manifest committed and easy to identify.",
      })
    }

    if (
      rootManifests.length === 0 &&
      nestedManifests.length > 0
    ) {
      findings.push({
        id: "dependency-no-root-manifest",
        category: "Dependencies",
        severity: "info",
        title:
          "Dependency manifests are only present in nested directories",
        description:
          `${nestedManifests.length} supported dependency manifest(s) were detected below the repository root, but none were found at the root level.`,
        confidence: 0.9,
        recommendation:
          "Confirm whether the repository is intentionally a monorepo or whether its primary dependency configuration should be easier to discover.",
      })
    }

    for (const manifest of missingRootLockfiles) {
      findings.push({
        id: `dependency-missing-root-lockfile-${manifest.fileName.toLowerCase()}`,
        category: "Dependencies",
        severity: "medium",
        title:
          `Root lockfile missing for ${manifest.fileName}`,
        description:
          `${manifest.fileName} is present at the repository root, but no recognized lockfile was found alongside it.`,
        file: manifest.path,
        confidence: 0.95,
        recommendation:
          `Commit an appropriate ${manifest.lockFiles.join(" or ")} lockfile when reproducible dependency resolution is expected.`,
      })
    }

    if (rootEcosystems.length > 1) {
      findings.push({
        id: "dependency-multiple-root-ecosystems",
        category: "Dependencies",
        severity: "info",
        title:
          "Multiple dependency ecosystems detected at repository root",
        description:
          `${rootEcosystems.length} dependency ecosystems are configured at the repository root: ${rootEcosystems.join(", ")}.`,
        confidence: 0.95,
        recommendation:
          "Document the role of each dependency ecosystem and how the project should be built and tested.",
      })
    }

    if (nestedManifests.length > 0) {
      findings.push({
        id: "dependency-nested-manifests-detected",
        category: "Dependencies",
        severity: "info",
        title:
          "Nested dependency manifests detected",
        description:
          `${nestedManifests.length} additional dependency manifest(s) were detected below the repository root. These may represent workspaces, packages, examples, fixtures, or other independent projects.`,
        confidence: 0.95,
        recommendation:
          "For large repositories, document workspace boundaries and distinguish production packages from examples, fixtures, and test projects.",
      })
    }

    const metrics = {
      dependencyManifestCount:
        detectedManifests.length,
      rootDependencyManifestCount:
        rootManifests.length,
      nestedDependencyManifestCount:
        nestedManifests.length,
      dependencyManifestTypes:
        new Set(
          detectedManifests.map(
            (manifest) => manifest.fileName
          )
        ).size,
      detectedLockFileCount:
        detectedLockFiles.length,
      detectedPackageManagerFileCount:
        detectedPackageManagerFiles.length,
      rootEcosystemCount:
        rootEcosystems.length,
      rootEcosystems:
        rootEcosystems.join(", "),
      ecosystemCount:
        allEcosystems.length,
      ecosystems:
        allEcosystems.join(", "),
      hasDependencyManifest:
        detectedManifests.length > 0,
      hasRootDependencyManifest:
        rootManifests.length > 0,
      hasLockfile:
        detectedLockFiles.length > 0,
      missingRequiredRootLockfiles:
        missingRootLockfiles.length,
      analysisLimited:
        context.tree.analysisLimited,
      treeTruncated:
        context.tree.truncated,
    }

    return {
      analyzer: "Dependency Analyzer",
      category: "Dependencies",
      score: 0,
      findings,
      metrics,
      recommendations: [],
    }
  },
}