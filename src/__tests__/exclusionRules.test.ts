import { describe, it, expect } from 'vitest'
import { matchesRule, applyRules, annotateTransactions } from '../lib/exclusionRules'
import type { ExclusionRule } from '../lib/exclusionRules'

const activeContains: ExclusionRule = {
  id: '1',
  pattern: 'Affitto Mario',
  matchType: 'contains',
  active: true,
}

const activeExact: ExclusionRule = {
  id: '2',
  pattern: 'Supermercato Esselunga',
  matchType: 'exact',
  active: true,
}

const inactiveRule: ExclusionRule = {
  id: '3',
  pattern: 'Palestra',
  matchType: 'contains',
  active: false,
}

describe('matchesRule', () => {
  it('contains match is case-insensitive', () => {
    expect(matchesRule('Pagamento Affitto Mario Rossi', activeContains)).toBe(true)
    expect(matchesRule('pagamento affitto mario rossi', activeContains)).toBe(true)
    expect(matchesRule('AFFITTO MARIO', activeContains)).toBe(true)
  })

  it('contains does not match unrelated description', () => {
    expect(matchesRule('Supermercato Coop', activeContains)).toBe(false)
  })

  it('exact match is case-insensitive and full string only', () => {
    expect(matchesRule('Supermercato Esselunga', activeExact)).toBe(true)
    expect(matchesRule('supermercato esselunga', activeExact)).toBe(true)
    expect(matchesRule('Pagamento Supermercato Esselunga', activeExact)).toBe(false)
  })

  it('inactive rule never matches', () => {
    expect(matchesRule('Palestra mensile', inactiveRule)).toBe(false)
  })
})

describe('applyRules', () => {
  const rules = [activeContains, activeExact, inactiveRule]

  it('returns first matching rule', () => {
    const result = applyRules('Pagamento Affitto Mario Rossi', rules)
    expect(result).toBe(activeContains)
  })

  it('returns null when no rule matches', () => {
    expect(applyRules('Netflix abbonamento', rules)).toBeNull()
  })

  it('does not return inactive rule', () => {
    expect(applyRules('Palestra mensile', rules)).toBeNull()
  })

  it('returns null for empty rules array', () => {
    expect(applyRules('anything', [])).toBeNull()
  })
})

describe('annotateTransactions', () => {
  const rules: ExclusionRule[] = [activeContains, activeExact, inactiveRule]

  const tx = (description: string) => ({
    date: '2024-06-01',
    month: '2024-06',
    description,
    amount: 100,
  })

  it('marks matching transaction as excluded with rule id', () => {
    const result = annotateTransactions([tx('Pagamento Affitto Mario Rossi')], rules)
    expect(result[0].excluded).toBe(true)
    expect(result[0].excludedByRuleId).toBe(activeContains.id)
  })

  it('leaves non-matching transaction as not excluded', () => {
    const result = annotateTransactions([tx('Netflix abbonamento')], rules)
    expect(result[0].excluded).toBe(false)
    expect(result[0].excludedByRuleId).toBeNull()
  })

  it('does not exclude a transaction matched only by an inactive rule', () => {
    const result = annotateTransactions([tx('Palestra mensile')], rules)
    expect(result[0].excluded).toBe(false)
  })

  it('handles empty transaction list', () => {
    expect(annotateTransactions([], rules)).toEqual([])
  })

  it('annotates multiple transactions independently', () => {
    const txs = [
      tx('Pagamento Affitto Mario Rossi'),
      tx('Netflix abbonamento'),
      tx('Supermercato Esselunga'),
    ]
    const result = annotateTransactions(txs, rules)
    expect(result[0].excluded).toBe(true)
    expect(result[1].excluded).toBe(false)
    expect(result[2].excluded).toBe(true)
    expect(result[2].excludedByRuleId).toBe(activeExact.id)
  })
})
