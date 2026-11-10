// "Surprises": after something is done, now and then a small bonus. What it is depends only on the id
// of the thing that was done, so undoing and doing it again never gives a new try.
import { hashStr } from './hash'

export const SURPRISE_ONE_IN = 4
export const SURPRISE_PER_DAY = 2
export const SURPRISE_PREFIX = 'surprise-'
/** Ids of awards that are bonuses themselves: they never start another surprise. */
const NO_SURPRISE = ['surprise-', 'challenge-', 'close-', 'routine-']

export type SurpriseKind = 'xp' | 'reward' | 'badge'
export interface Surprise {
  kind: SurpriseKind
  /** XP (5-20), reward minutes (5-15) or the number of the badge */
  amount: number
}

export const SURPRISE_BADGES = 6

let enabled = true
/** Tests switch surprises off, so that totals of XP stay exact; the surprise tests switch them on. */
export const setSurprisesEnabled = (on: boolean) => {
  enabled = on
}

/** Does this award get a surprise, and which? null = none. */
export function surpriseFor(awardId: string): Surprise | null {
  if (!enabled) return null
  if (NO_SURPRISE.some((p) => awardId.startsWith(p))) return null
  const h = hashStr(`surprise:${awardId}`)
  if (h % SURPRISE_ONE_IN !== 0) return null
  const r = (h >>> 3) % 3
  if (r === 0) return { kind: 'xp', amount: 5 + ((h >>> 6) % 16) }
  if (r === 1) return { kind: 'reward', amount: 5 + 5 * ((h >>> 6) % 3) }
  return { kind: 'badge', amount: (h >>> 6) % SURPRISE_BADGES }
}

/** The id under which the surprise of an award is paid (so taking the award back takes it back too). */
export const surpriseId = (awardId: string) => `${SURPRISE_PREFIX}${awardId}`
export const isSurpriseOf = (id: string, awardId: string) => id === surpriseId(awardId)
