export interface ParsedRepository {
  owner: string
  repository: string
  fullName: string
}

export function parseRepositoryUrl(
  value: string
): ParsedRepository | null {
  const input = value.trim()

  if (!input) {
    return null
  }

  try {
    const url = new URL(
      input.startsWith("http://") || input.startsWith("https://")
        ? input
        : `https://${input}`
    )

    if (url.hostname.toLowerCase() !== "github.com") {
      return null
    }

    const parts = url.pathname
      .split("/")
      .filter(Boolean)

    if (parts.length !== 2) {
      return null
    }

    const owner = parts[0]
    const repository = parts[1].replace(/\.git$/, "")

    if (!owner || !repository) {
      return null
    }

    return {
      owner,
      repository,
      fullName: `${owner}/${repository}`,
    }
  } catch {
    return null
  }
}