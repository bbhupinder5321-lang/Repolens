import type { RepositoryFile } from "./tree"

export const ANALYSIS_LIMITS = {
  maxFiles: 10_000,
  maxFileSizeBytes: 1_000_000,
} as const

export interface AnalysisSelection {
  files: RepositoryFile[]
  excludedFileCount: number
  excludedByFileCount: number
  excludedBySize: number
  limited: boolean
}

export function selectAnalysisFiles(
  files: RepositoryFile[]
): AnalysisSelection {
  const candidates = files.filter(
    (file) =>
      file.type === "file" &&
      (file.size === null ||
        file.size <= ANALYSIS_LIMITS.maxFileSizeBytes)
  )

  const excludedBySize =
    files.filter(
      (file) =>
        file.type === "file" &&
        file.size !== null &&
        file.size > ANALYSIS_LIMITS.maxFileSizeBytes
    ).length

  const selected = candidates.slice(
    0,
    ANALYSIS_LIMITS.maxFiles
  )

  const excludedByFileCount = Math.max(
    candidates.length - selected.length,
    0
  )

  return {
    files: selected,
    excludedFileCount:
      excludedBySize + excludedByFileCount,
    excludedByFileCount,
    excludedBySize,
    limited:
      excludedBySize > 0 ||
      excludedByFileCount > 0,
  }
}