import type { AiUsage } from '../../types'

/** USD per 1M tokens (input, output). Only models whose price I verified; others -> no estimate. */
export const PRICES: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
}

export function addUsage(u: AiUsage, month: string, input: number, output: number): AiUsage {
  const base = u.month === month ? u : { month, inputTokens: 0, outputTokens: 0, calls: 0 }
  return {
    month,
    inputTokens: base.inputTokens + input,
    outputTokens: base.outputTokens + output,
    calls: base.calls + 1,
  }
}

/** Estimated cost in USD, or null if the model price is unknown. */
export function estimateCost(model: string, input: number, output: number): number | null {
  const p = PRICES[model]
  return p ? (input * p[0] + output * p[1]) / 1_000_000 : null
}
