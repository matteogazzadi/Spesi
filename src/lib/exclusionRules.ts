import type { Transaction } from './parseExcel'

export type MatchType = 'contains' | 'exact'

export interface ExclusionRule {
  id: string
  pattern: string
  matchType: MatchType
  active: boolean
}

export interface AnnotatedTransaction extends Transaction {
  excluded: boolean
  excludedByRuleId: string | null
}

export function matchesRule(description: string, rule: ExclusionRule): boolean {
  if (!rule.active) return false
  const desc = description.toLowerCase()
  const pattern = rule.pattern.toLowerCase()
  if (rule.matchType === 'exact') return desc === pattern
  return desc.includes(pattern)
}

export function applyRules(
  description: string,
  rules: ExclusionRule[],
): ExclusionRule | null {
  for (const rule of rules) {
    if (matchesRule(description, rule)) return rule
  }
  return null
}

export function annotateTransactions(
  transactions: Transaction[],
  rules: ExclusionRule[],
): AnnotatedTransaction[] {
  return transactions.map((t) => {
    const matched = applyRules(t.description, rules)
    return {
      ...t,
      excluded: matched !== null,
      excludedByRuleId: matched?.id ?? null,
    }
  })
}
