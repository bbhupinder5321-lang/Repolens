export interface FindingFilter {
  category?: string | null
  severity?: string | null
}

/** Applies category and severity filters together; null/undefined means no filter. */
export function filterFindings<T extends { category: string; severity: string }>(
  findings: T[],
  filters: FindingFilter = {},
): T[] {
  return findings.filter((finding) =>
    (!filters.category || finding.category === filters.category) &&
    (!filters.severity || finding.severity === filters.severity)
  )
}
