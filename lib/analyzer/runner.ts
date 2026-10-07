import type { Analyzer } from "./analyzer"
import type { AnalyzerContext } from "./context"
import type { AnalysisResult } from "./types"

export async function runAnalyzers(
  analyzers: Analyzer[],
  context: AnalyzerContext
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = []

  for (const analyzer of analyzers) {
    const result = await analyzer.analyze(context)

    results.push(result)
  }

  return results
}