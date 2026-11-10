// "Close the day": three short steps in the evening. Pure helpers + one store action.
import type { Activity, AppData } from '../types'
import { addDaysStr, timeToMin } from './dates'
import { occurrencesOn } from './schedule'
import { t } from '../i18n'
import { useStore } from '../store'

export const CLOSE_XP = 10
/** The "Close the day" card appears this long before bedtime. */
export const CLOSE_LEAD_MIN = 120

/** Is it evening for this user (from 2 h before bedtime until morning)? */
export function isEvening(settings: { bedTime: string; wakeTime: string }, now: Date): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const wake = timeToMin(settings.wakeTime)
  let bed = timeToMin(settings.bedTime)
  if (bed <= wake) bed += 1440
  // after midnight, before waking: still the evening of the day that is ending
  const abs = nowMin < wake ? nowMin + 1440 : nowMin
  return abs >= bed - CLOSE_LEAD_MIN
}

/** The day that is being closed: after midnight it is still yesterday. */
export function dayBeingClosed(settings: { wakeTime: string }, now: Date, today: string): string {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin < timeToMin(settings.wakeTime) ? addDaysStr(today, -1) : today
}

export interface DayReview {
  done: number
  open: Activity[]
  xp: number
}

/** What happened on a day: how many things are done, which are not, and the XP earned. */
export function reviewDay(data: AppData, date: string): DayReview {
  const occ = occurrencesOn(data, date).filter((o) => o.type === 'activity' && !o.suggested)
  const open = occ
    .filter((o) => o.status === 'planned')
    .map((o) => data.activities.find((a) => a.id === o.activityId))
    .filter((a): a is Activity => !!a)
  return {
    done: occ.filter((o) => o.status === 'done').length,
    open,
    xp: data.progress.events.filter((e) => e.date === date).reduce((n, e) => n + e.xp, 0),
  }
}

/** The bedtime to suggest: the one from the settings. */
export const suggestedBed = (settings: { bedTime: string }) => settings.bedTime

export interface CloseInput {
  date: string
  mood: 1 | 2 | 3 | 4 | 5 | null
  note: string
  /** Activities to move to the next day (one-off ones only); the rest stay as they are. */
  moveIds: string[]
  /** The ones that are skipped for good */
  skipIds: string[]
  mainThing: string
}

export function closeDay(input: CloseInput) {
  const st = useStore.getState()
  const next = addDaysStr(input.date, 1)
  for (const id of input.moveIds) {
    const a = st.activities.find((x) => x.id === id)
    if (a && a.recurrence === 'none') st.update('activities', id, { date: next })
  }
  for (const id of input.skipIds) {
    const a = st.activities.find((x) => x.id === id)
    if (a && a.recurrence === 'none') st.update('activities', id, { status: 'skipped' })
  }
  st.setDay(input.date, { closed: { mood: input.mood, note: input.note.trim() } })
  if (input.mainThing.trim()) st.setDay(next, { mainThing: input.mainThing.trim() })
  st.award({
    id: `close-${input.date}`,
    date: input.date,
    reason: t('close.title'),
    xp: CLOSE_XP,
    category: 'habits',
  })
}
