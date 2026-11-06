// Browser notifications logic (pure part). The browser can only show them while the app is open
// or recently used; for reliable phone reminders use the .ics export (see lib/ics.ts).
import type { AppData } from '../types'
import { addDaysStr, daysUntil, timeToMin, todayStr } from './dates'
import { occurrencesOn } from './schedule'

export interface Reminder {
  id: string
  title: string
  body: string
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
        title: o.type === 'class' ? '📚 Uskoro predavanje/vežbe' : '⏰ Uskoro',
        body: `${o.title} počinje u ${o.start} (za ${until} min)`,
      })
    }
  }

  for (const a of data.assessments) {
    if (a.registration === 'nije-prijavljen' && a.registrationDeadline) {
      const d = daysUntil(a.registrationDeadline, today)
      if (d >= 0 && d <= 1 && nowMin >= 9 * 60)
        out.push({
          id: `reg-${a.id}-${today}`,
          title: '🚨 Prijava kolokvijuma',
          body: `${a.title}: rok za prijavu ${d === 0 ? 'je danas' : 'je sutra'}!`,
        })
    }
    if ((a.type === 'domaci' || a.type === 'lab') && !a.done) {
      const d = daysUntil(a.date, today)
      if (d >= 0 && d <= 1 && nowMin >= 9 * 60)
        out.push({
          id: `due-${a.id}-${today}`,
          title: '📝 Rok predaje',
          body: `${a.title} ${d === 0 ? 'danas' : 'sutra'}`,
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
      title: '😴 Vreme za spavanje',
      body: `Cilj: legni u ${data.settings.bedTime}. Odloži ekran.`,
    })
  }

  return out.filter((r) => !sent.has(r.id))
}
