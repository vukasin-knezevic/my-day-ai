// Browser notifications logic (pure part). The browser can only show them while the app is open
// or recently used; for reliable phone reminders use the .ics export (see lib/ics.ts).
import type { AppData } from '../types'
import { addDaysStr, daysUntil, formatTimeOfDay, timeToMin, todayStr } from './dates'
import { isExam, registrationDue } from './exams'
import { occurrencesOn } from './schedule'
import { addressName } from './address'
import { routineGoal, routineSteps, tickedOn } from './routine'
import { t } from '../i18n'

export interface Reminder {
  id: string
  title: string
  body: string
  /** Buttons inside the notification (Android) */
  actions?: { action: string; title: string }[]
}

export const LEAD = { event: 15, bed: 30 }

/** Reminders that should fire right now (within the lead time and not yet sent). */
export function dueReminders(data: AppData, now: Date, sent: ReadonlySet<string>): Reminder[] {
  const today = todayStr(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const out: Reminder[] = []

  for (const o of occurrencesOn(data, today)) {
    if (o.suggested || o.status !== 'planned') continue
    const until = timeToMin(o.start) - nowMin
    if (until >= 0 && until <= LEAD.event) {
      out.push({
        id: `ev-${o.key}`,
        title: o.type === 'class' ? t('rem.class') : t('rem.soon'),
        body: t('rem.body', { title: o.title, start: formatTimeOfDay(o.start), n: until }),
      })
    }
  }

  for (const a of data.assessments) {
    const due = registrationDue(a)
    if (due) {
      const d = daysUntil(due.date, today)
      if (d >= 0 && d <= 1 && nowMin >= 9 * 60)
        out.push({
          id: `reg-${a.id}-${today}`,
          title: t('rem.reg.title'),
          body: t(due.assumed ? 'rem.reg.check' : d === 0 ? 'rem.reg.today' : 'rem.reg.tomorrow', {
            title: a.title,
          }),
        })
    }
    if (!isExam(a) && !a.done) {
      const d = daysUntil(a.date, today)
      if (d >= 0 && d <= 1 && nowMin >= 9 * 60)
        out.push({
          id: `due-${a.id}-${today}`,
          title: t('rem.due.title'),
          body: `${a.title} ${d === 0 ? t('when.today') : t('when.tomorrow')}`,
        })
    }
  }

  // the morning routine, at the wake-up goal (with a "Done" button where the system shows buttons)
  const set = data.settings
  if (set.routineOn && set.onboarded) {
    const goal = timeToMin(routineGoal(set))
    const left = routineSteps(set).length - tickedOn(data, today).length
    if (nowMin >= goal && nowMin <= goal + 30 && left > 0) {
      const name = addressName(set)
      const main = data.days[today]?.mainThing
      out.push({
        id: `routine-${today}`,
        title: name ? t('rem.routine.title', { name }) : t('rem.routine.titleNoName'),
        body: `${t('rem.routine.body', { n: left })}${main ? ` · ${t('rem.routine.main', { text: main })}` : ''}`,
        actions: [{ action: 'done', title: t('rem.routine.done') }],
      })
    }
  }

  // bedtime (settings.bedTime can be after midnight, e.g. 01:00 -> also checked for "tomorrow" 24:00+)
  const bed = timeToMin(data.settings.bedTime)
  const bedAbs = bed < 12 * 60 ? bed + 1440 : bed
  const nowAbs = nowMin < 6 * 60 ? nowMin + 1440 : nowMin
  const untilBed = bedAbs - nowAbs
  if (untilBed >= 0 && untilBed <= LEAD.bed) {
    const key = nowMin < 6 * 60 ? addDaysStr(today, -1) : today
    out.push({
      id: `bed-${key}`,
      title: t('rem.bed.title'),
      body: t('rem.bed.body', { time: formatTimeOfDay(data.settings.bedTime) }),
    })
  }

  return out.filter((r) => !sent.has(r.id))
}
