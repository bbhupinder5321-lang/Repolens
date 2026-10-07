const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  ".gradle",
  "target",
  "bin",
  "obj",
  ".turbo",
  ".cache",
  ".parcel-cache",
  ".nuxt",
  ".output",
])

const IGNORED_FILE_NAMES = new Set([
  ".ds_store",
  "thumbs.db",
])

export function shouldAnalyzePath(path: string): boolean {
  const normalizedPath = path
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")

  if (!normalizedPath) {
    return false
  }

  const segments = normalizedPath.split("/")

  if (
    segments.some((segment) =>
      IGNORED_DIRECTORY_NAMES.has(segment)
    )
  ) {
    return false
  }

  const fileName = segments[segments.length - 1].toLowerCase()

  if (IGNORED_FILE_NAMES.has(fileName)) {
    return false
  }

  return true
}