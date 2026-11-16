// "Move to the next free slot": plain code, no AI. It looks at the day's own schedule (activities and
// classes), keeps the length of the thing, and picks the first gap on 15-minute marks: today after now,
// otherwise tomorrow. A thing never moves to an earlier time on its own day.
import type { AppData } from '../types'
import { addDaysStr, minToTime, timeToMin, todayStr } from './dates'
import { daySpan, occurrencesOn, type DayBounds, type Occurrence } from './schedule'

const STEP = 15

export interface FreeSlot {
  date: string
  start: string
  end: string
}

const ceilStep = (m: number) => Math.ceil(m / STEP) * STEP

/** Busy stretches of `date`, in minutes from its midnight (what spills over from the day before too). */
function busy(
  data: Pick<AppData, 'activities' | 'subjects'>,
  date: string,
  bounds: DayBounds,
  skipKey: string,
): [number, number][] {
  const out: [number, number][] = []
  const take = (o: Occurrence, shift: number) => {
    if (o.key === skipKey || o.status === 'skipped' || o.suggested) return
    const s = daySpan(o, bounds)
    out.push([s.start + shift, s.end + shift])
  }
  for (const o of occurrencesOn(data, date)) take(o, 0)
  for (const o of occurrencesOn(data, addDaysStr(date, -1))) take(o, -1440)
  return out.filter(([, end]) => end > 0)
}

/**
 * The first free gap for `o` (same length), or null when today and tomorrow are full.
 * `now` decides what "already past" means.
 */
export function findFreeSlot(
  data: Pick<AppData, 'activities' | 'subjects'>,
  o: Pick<Occurrence, 'key' | 'date' | 'start' | 'end'>,
  bounds: DayBounds,
  now: Date,
): FreeSlot | null {
  const today = todayStr(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const own = daySpan(o, bounds)
  const length = own.end - own.start
  const wake = timeToMin(bounds.wakeTime)
  const bed = timeToMin(bounds.bedTime)
  const dayEnd = bed <= wake ? bed + 1440 : bed
  const first = o.date > today ? o.date : today
  for (const date of [first, addDaysStr(first, 1)]) {
    let from = wake
    if (date === today) from = Math.max(from, nowMin)
    if (date === o.date) from = Math.max(from, own.start + 1) // never earlier than where it is now
    const taken = busy(data, date, bounds, o.key)
    for (let s = ceilStep(from); s + length <= dayEnd; s += STEP) {
      if (taken.every(([a, b]) => s + length <= a || s >= b))
        return { date, start: minToTime(s), end: minToTime(s + length) }
    }
  }
  return null
}
