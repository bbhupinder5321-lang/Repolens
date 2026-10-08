import type { Analyzer } from "@/lib/analyzer/analyzer"
import type { AnalyzerContext } from "@/lib/analyzer/context"
import type {
  AnalysisResult,
  Finding,
} from "@/lib/analyzer/types"

const SENSITIVE_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  ".env.staging",
  ".env.dev",
  ".env.prod",
  ".npmrc",
  ".pypirc",
  ".netrc",
  "credentials",
  "credentials.json",
  "secrets.json",
  "secret.json",
  "service-account.json",
  "serviceaccount.json",
])

const PRIVATE_KEY_FILE_PATTERNS = [
  /^id_rsa$/i,
  /^id_dsa$/i,
  /^id_ecdsa$/i,
  /^id_ed25519$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
]

const SECURITY_POLICY_NAMES = new Set([
  "security.md",
  "security.txt",
])

const GITHUB_SECURITY_CONFIG_PATHS = new Set([
  ".github/dependabot.yml",
  ".github/dependabot.yaml",
  ".github/codeql-config.yml",
  ".github/codeql-config.yaml",
])

const SECRET_LIKE_FILE_PATTERNS = [
  /(^|\/)secrets?(\/|$)/i,
  /(^|\/)credentials?(\/|$)/i,
  /(^|\/)private[-_]?keys?(\/|$)/i,
]

const ENV_FILE_PATTERN = /^\.env(?:\..+)?$/i

const ENV_EXAMPLE_PATTERN =
  /^\.env(?:\.example|\.sample|\.template)$/i

function getFileName(path: string): string {
  return (
    path.split("/").pop() ?? ""
  ).toLowerCase()
}

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
}

function getDirectory(path: string): string {
  const normalizedPath =
    normalizePath(path)

  const parts =
    normalizedPath.split("/")

  if (parts.length <= 1) {
    return "."
  }

  return parts
    .slice(0, -1)
    .join("/")
}

function isRootFile(path: string): boolean {
  return getDirectory(path) === "."
}

function isSensitiveFileName(
  path: string
): boolean {
  const fileName = getFileName(path)

  if (
    ENV_EXAMPLE_PATTERN.test(fileName)
  ) {
    return false
  }

  if (SENSITIVE_FILE_NAMES.has(fileName)) {
    return true
  }

  return ENV_FILE_PATTERN.test(fileName)
}

function isPrivateKeyFile(
  path: string
): boolean {
  const fileName =
    path.split("/").pop() ?? ""

  return PRIVATE_KEY_FILE_PATTERNS.some(
    (pattern) =>
      pattern.test(fileName)
  )
}

function isSecretLikePath(
  path: string
): boolean {
  const normalizedPath =
    normalizePath(path)

  return SECRET_LIKE_FILE_PATTERNS.some(
    (pattern) =>
      pattern.test(normalizedPath)
  )
}

function isSecurityPolicyFile(
  path: string
): boolean {
  return SECURITY_POLICY_NAMES.has(
    getFileName(path)
  )
}

function isGitHubSecurityConfig(
  path: string
): boolean {
  return GITHUB_SECURITY_CONFIG_PATHS.has(
    normalizePath(path).toLowerCase()
  )
}

export const securityAnalyzer: Analyzer = {
  name: "Security Analyzer",
  category: "Security",

  async analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult> {
    const fileEntries =
      context.tree.files.filter(
        (file) => file.type === "file"
      )

    const sensitiveFiles =
      fileEntries.filter((file) =>
        isSensitiveFileName(file.path)
      )

    const rootSensitiveFiles =
      sensitiveFiles.filter((file) =>
        isRootFile(file.path)
      )

    const nestedSensitiveFiles =
      sensitiveFiles.filter(
        (file) => !isRootFile(file.path)
      )

    const privateKeyFiles =
      fileEntries.filter((file) =>
        isPrivateKeyFile(file.path)
      )

    const rootPrivateKeyFiles =
      privateKeyFiles.filter((file) =>
        isRootFile(file.path)
      )

    const nestedPrivateKeyFiles =
      privateKeyFiles.filter(
        (file) => !isRootFile(file.path)
      )

    const secretLikePaths =
      fileEntries.filter((file) =>
        isSecretLikePath(file.path)
      )

    const securityPolicyFiles =
      fileEntries.filter((file) =>
        isSecurityPolicyFile(file.path)
      )

    const githubSecurityConfigFiles =
      fileEntries.filter((file) =>
        isGitHubSecurityConfig(file.path)
      )

    const findings: Finding[] = []

    if (
      rootSensitiveFiles.length > 0
    ) {
      findings.push({
        id: "security-root-sensitive-files-detected",
        category: "Security",
        severity: "high",
        title:
          "Potentially sensitive files are tracked at repository root",
        description:
          `${rootSensitiveFiles.length} potentially sensitive file(s) were detected at the repository root. Filename detection does not prove that these files contain secrets.`,
        file:
          rootSensitiveFiles[0].path,
        confidence: 0.9,
        recommendation:
          "Review these files carefully. Keep real credentials and environment secrets outside version control and use an appropriate secret-management mechanism.",
      })
    }

    if (
      nestedSensitiveFiles.length > 0
    ) {
      findings.push({
        id: "security-nested-sensitive-files-detected",
        category: "Security",
        severity: "info",
        title:
          "Nested sensitive-looking files detected",
        description:
          `${nestedSensitiveFiles.length} potentially sensitive-looking file(s) were found below the repository root. These may belong to fixtures, examples, tests, packages, or other nested projects.`,
        file:
          nestedSensitiveFiles[0].path,
        confidence: 0.8,
        recommendation:
          "Review nested environment and credential-like files to confirm that they contain only safe development or fixture values.",
      })
    }

    if (
      rootPrivateKeyFiles.length > 0
    ) {
      findings.push({
        id: "security-root-private-key-files-detected",
        category: "Security",
        severity: "critical",
        title:
          "Potential private key files detected at repository root",
        description:
          `${rootPrivateKeyFiles.length} file(s) at the repository root match common private-key or certificate filename patterns. The analyzer does not read their contents.`,
        file:
          rootPrivateKeyFiles[0].path,
        confidence: 0.95,
        recommendation:
          "Verify that these files do not contain active private keys or credentials. If sensitive material was committed, rotate the affected credentials and remove the material from repository history.",
      })
    }

    if (
      nestedPrivateKeyFiles.length > 0
    ) {
      findings.push({
        id: "security-nested-private-key-files-detected",
        category: "Security",
        severity: "high",
        title:
          "Potential private key files detected in nested directories",
        description:
          `${nestedPrivateKeyFiles.length} nested file(s) match common private-key or certificate filename patterns. The analyzer does not read their contents.`,
        file:
          nestedPrivateKeyFiles[0].path,
        confidence: 0.9,
        recommendation:
          "Review these files carefully, especially when they are outside clearly documented test fixtures or sample data.",
      })
    }

    if (
      secretLikePaths.length > 0 &&
      sensitiveFiles.length === 0
    ) {
      findings.push({
        id: "security-secret-like-paths-detected",
        category: "Security",
        severity: "medium",
        title:
          "Secret-like directories detected",
        description:
          `${secretLikePaths.length} file(s) are located under directories commonly associated with secrets or credentials. This is a structural signal, not proof of exposed secrets.`,
        file:
          secretLikePaths[0].path,
        confidence: 0.8,
        recommendation:
          "Review these paths and ensure they contain no live credentials, private keys, access tokens, or other sensitive material.",
      })
    }

    if (
      securityPolicyFiles.length === 0
    ) {
      findings.push({
        id: "security-no-security-policy",
        category: "Security",
        severity: "low",
        title:
          "Security policy is missing",
        description:
          "No SECURITY.md or SECURITY.txt file was detected.",
        confidence: 0.95,
        recommendation:
          "Consider adding a security policy that explains how vulnerability reports should be submitted and handled.",
      })
    }

    const metrics = {
      sensitiveFileCount:
        sensitiveFiles.length,
      rootSensitiveFileCount:
        rootSensitiveFiles.length,
      nestedSensitiveFileCount:
        nestedSensitiveFiles.length,
      privateKeyFileCount:
        privateKeyFiles.length,
      rootPrivateKeyFileCount:
        rootPrivateKeyFiles.length,
      nestedPrivateKeyFileCount:
        nestedPrivateKeyFiles.length,
      secretLikePathCount:
        secretLikePaths.length,
      securityPolicyFileCount:
        securityPolicyFiles.length,
      githubSecurityConfigFileCount:
        githubSecurityConfigFiles.length,
      hasSecurityPolicy:
        securityPolicyFiles.length > 0,
      hasGitHubSecurityConfiguration:
        githubSecurityConfigFiles.length > 0,
      analysisLimited:
        context.tree.analysisLimited,
      treeTruncated:
        context.tree.truncated,
    }

    return {
      analyzer: "Security Analyzer",
      category: "Security",
      score: 0,
      findings,
      metrics,
      recommendations: [],
    }
  },
}