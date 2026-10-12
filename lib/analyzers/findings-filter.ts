export type FindingFilter = {
  severity: string
  category: string
}

export function filterFindings<T extends FindingFilter>(
  findings: T[],
  severity: string,
  category: string | null
): T[] {
  return findings.filter(
    (finding) =>
      (severity === "all" || finding.severity === severity) &&
      (!category || finding.category === category)
  )
}
