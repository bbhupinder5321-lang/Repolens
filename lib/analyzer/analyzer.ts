import type { AnalyzerContext } from "./context"
import type { AnalysisResult } from "./types"

export interface Analyzer {
  name: string
  category: string

  analyze(
    context: AnalyzerContext
  ): Promise<AnalysisResult>
}