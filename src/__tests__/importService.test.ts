import { describe, it, expect } from 'vitest'
import { computeTotalSpent } from '../lib/importService'
import type { AnnotatedTransaction } from '../lib/exclusionRules'

function tx(amount: number, excluded: boolean): AnnotatedTransaction {
  return {
    date: '2024-06-01',
    month: '2024-06',
    description: 'Test',
    amount,
    excluded,
    excludedByRuleId: excluded ? 'rule-1' : null,
  }
}

describe('computeTotalSpent', () => {
  it('sums only non-excluded transactions', () => {
    const txs = [tx(100, false), tx(50, true), tx(200, false)]
    expect(computeTotalSpent(txs)).toBeCloseTo(300)
  })

  it('returns 0 when all transactions are excluded', () => {
    expect(computeTotalSpent([tx(100, true), tx(200, true)])).toBe(0)
  })

  it('returns full sum when none are excluded', () => {
    expect(computeTotalSpent([tx(100, false), tx(50, false)])).toBeCloseTo(150)
  })

  it('returns 0 for empty list', () => {
    expect(computeTotalSpent([])).toBe(0)
  })
})
