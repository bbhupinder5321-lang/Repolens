import { github } from "./client"

export interface RepositoryMetadata {
  requestedOwner: string
  requestedName: string
  owner: string
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  defaultBranch: string
  stars: number
  forks: number
  openIssues: number
  watchers: number
  language: string | null
  sizeKb: number
  isPrivate: boolean
  isArchived: boolean
  isFork: boolean
  createdAt: string | null
  updatedAt: string | null
  pushedAt: string | null
  license: string | null
  topics: string[]
}

export async function getRepositoryMetadata(
  owner: string,
  repository: string
): Promise<RepositoryMetadata> {
  const response = await github.rest.repos.get({
    owner,
    repo: repository,
  })

  const repo = response.data

  return {
    requestedOwner: owner,
    requestedName: repository,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    watchers: repo.watchers_count,
    language: repo.language,
    sizeKb: repo.size,
    isPrivate: repo.private,
    isArchived: repo.archived,
    isFork: repo.fork,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    license: repo.license?.spdx_id ?? null,
    topics: repo.topics ?? [],
  }
}