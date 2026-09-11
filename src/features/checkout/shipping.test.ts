import { describe, expect, it } from 'vitest'
import { calcShippingCostPreview } from './shipping'

describe('calcShippingCostPreview', () => {
  it('returns 0 when the rule is disabled', () => {
    expect(calcShippingCostPreview({ enabled: false, cost_cents: 2000 }, 10000)).toBe(0)
  })

  it('returns 0 when the rule is undefined', () => {
    expect(calcShippingCostPreview(undefined, 10000)).toBe(0)
  })

  it('returns the flat cost when below the free-shipping threshold', () => {
    expect(
      calcShippingCostPreview({ enabled: true, cost_cents: 2500, free_above_cents: 30000 }, 10000),
    ).toBe(2500)
  })

  it('returns 0 once the subtotal reaches the free-shipping threshold', () => {
    expect(
      calcShippingCostPreview({ enabled: true, cost_cents: 2500, free_above_cents: 30000 }, 30000),
    ).toBe(0)
  })

  it('returns the flat cost when there is no free-shipping threshold configured', () => {
    expect(calcShippingCostPreview({ enabled: true, cost_cents: 1500 }, 999999)).toBe(1500)
  })
})
