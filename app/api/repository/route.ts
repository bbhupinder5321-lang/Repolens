import { NextResponse } from "next/server"

import { documentationAnalyzer } from "@/lib/analyzers/documentation"
import { structureAnalyzer } from "@/lib/analyzers/structure"
import { testingAnalyzer } from "@/lib/analyzers/testing"
import { parseRepositoryUrl } from "@/lib/github/parse-repository-url"
import { getRepositoryMetadata } from "@/lib/github/repository"
import { getRepositoryTree } from "@/lib/github/tree"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const value =
      typeof body?.url === "string"
        ? body.url
        : ""

    const parsed = parseRepositoryUrl(value)

    if (!parsed) {
      return NextResponse.json(
        {
          error: "Enter a valid GitHub repository URL.",
        },
        {
          status: 400,
        }
      )
    }

    const repository = await getRepositoryMetadata(
      parsed.owner,
      parsed.repository
    )

    const tree = await getRepositoryTree(
      repository.owner,
      repository.name,
      repository.defaultBranch
    )

    const structure = await structureAnalyzer.analyze({
      repository,
      tree,
    })

    const documentation =
      await documentationAnalyzer.analyze({
        repository,
        tree,
      })

    const testing = await testingAnalyzer.analyze({
      repository,
      tree,
    })

    return NextResponse.json({
      repository,
      tree,
      analysis: {
        structure,
        documentation,
        testing,
      },
    })
  } catch (error) {
    console.error("Repository lookup failed:", error)

    return NextResponse.json(
      {
        error: "Unable to retrieve this GitHub repository.",
      },
      {
        status: 404,
      }
    )
  }
} 