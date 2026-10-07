import type { RepositoryMetadata } from "@/lib/github/repository"
import type { RepositoryTree } from "@/lib/github/tree"

export interface AnalyzerContext {
  repository: RepositoryMetadata
  tree: RepositoryTree
}