export type FindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"

export interface Finding {
  id: string
  category: string
  severity: FindingSeverity
  title: string
  description: string
  file?: string
  line?: number
  confidence?: number
  recommendation?: string
}

export interface AnalysisResult {
  analyzer: string
  category: string
  score: number
  findings: Finding[]
  metrics: Record<string, number | string | boolean>
  recommendations: string[]
}

export interface AnalysisSummary {
  score: number
  findings: Finding[]
  metrics: Record<string, number | string | boolean>
  recommendations: string[]
}