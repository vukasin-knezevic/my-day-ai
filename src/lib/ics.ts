// iCalendar (.ics) export so the phone's calendar app can remind you (works without this app being open).
import type { AppData } from '../types'
import { addDaysStr, minToTime, timeToMin, todayStr } from './dates'
import { isExam, registrationDue } from './exams'
import { occurrencesOn } from './schedule'
import { t } from '../i18n'
import { shareOrDownload, type ShareResult } from './files'

const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const compactDate = (d: string) => d.replace(/-/g, '')
const compactTime = (t: string) => t.replace(':', '') + '00'

const utf8 = new TextEncoder()
/** Room for text in one line: RFC 5545 allows 75 octets and a continuation starts with a space. */
const FOLD_OCTETS = 74

/** RFC 5545 line folding. Counts octets, so Serbian letters and emoji are not cut in half. */
function fold(line: string): string {
  const parts: string[] = []
  let part = ''
  let octets = 0
  for (const ch of line) {
    const size = utf8.encode(ch).length
    if (octets + size > FOLD_OCTETS) {
      parts.push(part)
      part = ''
      octets = 0
    }
    part += ch
    octets += size
  }
  parts.push(part)
  return parts.join('\r\n ')
}

function stamp(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

interface Ev {
  uid: string
  summary: string
  date: string
  start?: string
  end?: string
  alarmMin?: number
  description?: string
}

function vevent(e: Ev, dtstamp: string): string[] {
  const l = [
    'BEGIN:VEVENT',
    `UID:${e.uid}@my-day-ai`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${esc(e.summary)}`,
  ]
  if (e.start && e.end) {
    l.push(
      `DTSTART:${compactDate(e.date)}T${compactTime(e.start)}`,
      `DTEND:${compactDate(e.date)}T${compactTime(e.end)}`,
    )
  } else {
    l.push(
      `DTSTART;VALUE=DATE:${compactDate(e.date)}`,
      `DTEND;VALUE=DATE:${compactDate(addDaysStr(e.date, 1))}`,
    )
  }
  if (e.description) l.push(`DESCRIPTION:${esc(e.description)}`)
  if (e.alarmMin !== undefined)
    l.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(e.summary)}`,
      `TRIGGER:-PT${e.alarmMin}M`,
      'END:VALARM',
    )
  l.push('END:VEVENT')
  return l
}

/** Builds the calendar text for the next `days` days. Suggestions (not accepted yet) are skipped. */
export function buildIcs(data: AppData, now: Date = new Date(), days = 60): string {
  const events: Ev[] = []
  for (let i = 0; i < days; i++) events.push(...eventsOfDay(data, now, i))
  return finishIcs(data, now, events)
}

/** Same as `buildIcs`, but gives the screen a chance to draw (0-1 progress) while the days are processed. */
export async function buildIcsWithProgress(
  data: AppData,
  onProgress: (fraction: number) => void,
  now: Date = new Date(),
  days = 60,
): Promise<string> {
  const events: Ev[] = []
  for (let i = 0; i < days; i++) {
    events.push(...eventsOfDay(data, now, i))
    if (i % 6 === 5) {
      onProgress((i + 1) / days)
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  onProgress(1)
  return finishIcs(data, now, events)
}

function eventsOfDay(data: AppData, now: Date, offset: number): Ev[] {
  const date = addDaysStr(todayStr(now), offset)
  return occurrencesOn(data, date)
    .filter((o) => !o.suggested && o.status !== 'skipped')
    .map((o) => ({ uid: o.key, summary: o.title, date, start: o.start, end: o.end, alarmMin: 15 }))
}

function finishIcs(data: AppData, now: Date, events: Ev[]): string {
  const today = todayStr(now)
  const dtstamp = stamp(now)
  for (const a of data.assessments) {
    if (a.date < today) continue
    const sub = data.subjects.find((s) => s.id === a.subjectId)?.name ?? ''
    events.push({
      uid: `as-${a.id}`,
      summary: `${isExam(a) ? '🎓' : '📝'} ${a.title}${sub ? ` (${sub})` : ''}`,
      date: a.date,
      start: a.time,
      end: a.time ? addMinutes(a.time, 90) : undefined,
      alarmMin: 24 * 60,
    })
    const due = registrationDue(a)
    if (due && due.date >= today)
      events.push({
        uid: `reg-${a.id}`,
        summary: t(due.assumed ? 'ics.regCheck' : 'ics.regDeadline', { title: a.title }),
        date: due.date,
        alarmMin: 0,
      })
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My Day AI//SR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:My Day AI',
    ...events.flatMap((e) => vevent(e, dtstamp)),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

const addMinutes = (time: string, m: number) => minToTime(Math.min(1439, timeToMin(time) + m))

/**
 * Hands the calendar file to the phone: the share sheet offers the Calendar app straight away.
 * Without Web Share for files (a laptop) it is an ordinary download. Returns what happened.
 */
export function shareCalendar(text: string, filename = 'my-day-ai.ics'): Promise<ShareResult> {
  return shareOrDownload(filename, text, 'text/calendar')
}
