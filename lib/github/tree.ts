import { github } from "./client"
import { shouldAnalyzePath } from "./analysis-filter"
import { selectAnalysisFiles } from "./analysis-limits"

export interface RepositoryFile {
  path: string
  type: "file" | "directory"
  size: number | null
  sha: string
}

export interface RepositoryTree {
  branch: string
  files: RepositoryFile[]
  analysisFiles: RepositoryFile[]
  analysisLimited: boolean
  analysisExcludedFileCount: number
  analysisExcludedByFileCount: number
  analysisExcludedBySize: number
  truncated: boolean
}

export async function getRepositoryTree(
  owner: string,
  repository: string,
  branch: string
): Promise<RepositoryTree> {
  const response = await github.rest.git.getTree({
    owner,
    repo: repository,
    tree_sha: branch,
    recursive: "true",
  })

  const files: RepositoryFile[] = response.data.tree
    .filter(
      (item) =>
        item.type === "blob" ||
        item.type === "tree"
    )
    .map((item): RepositoryFile => ({
      path: item.path ?? "",
      type: item.type === "tree" ? "directory" : "file",
      size: item.size ?? null,
      sha: item.sha ?? "",
    }))
    .filter((item) => item.path && item.sha)

  const analysisCandidates = files.filter(
    (file) =>
      file.type === "file" &&
      shouldAnalyzePath(file.path)
  )

  const analysisSelection = selectAnalysisFiles(
    analysisCandidates
  )

  return {
    branch,
    files,
    analysisFiles: analysisSelection.files,
    analysisLimited: analysisSelection.limited,
    analysisExcludedFileCount:
      analysisSelection.excludedFileCount,
    analysisExcludedByFileCount:
      analysisSelection.excludedByFileCount,
    analysisExcludedBySize:
      analysisSelection.excludedBySize,
    truncated: response.data.truncated ?? false,
  }
}