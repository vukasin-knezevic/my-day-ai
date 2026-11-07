// iCalendar (.ics) export so the phone's calendar app can remind you (works without this app being open).
import type { AppData } from '../types'
import { addDaysStr, todayStr } from './dates'
import { occurrencesOn } from './schedule'
import { t } from '../i18n'
import { isExamType } from './kinds'

const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const compactDate = (d: string) => d.replace(/-/g, '')
const compactTime = (t: string) => t.replace(':', '') + '00'

/** RFC 5545: lines must be folded at 75 octets. We fold by characters, which is safe for ASCII-heavy text. */
function fold(line: string): string {
  if (line.length <= 73) return line
  const parts: string[] = []
  for (let i = 0; i < line.length; i += 73) parts.push(line.slice(i, i + 73))
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
      summary: `${isExamType(a.type) ? '🎓' : '📝'} ${a.title}${sub ? ` (${sub})` : ''}`,
      date: a.date,
      start: a.time,
      end: a.time ? addMinutes(a.time, 90) : undefined,
      alarmMin: 24 * 60,
    })
    if (
      a.registrationDeadline &&
      a.registrationDeadline >= today &&
      a.registration === 'nije-prijavljen'
    )
      events.push({
        uid: `reg-${a.id}`,
        summary: t('ics.regDeadline', { title: a.title }),
        date: a.registrationDeadline,
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

function addMinutes(t: string, m: number): string {
  const total = Math.min(23 * 60 + 59, Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + m)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Hands the calendar file to the phone: the share sheet offers the Calendar app straight away.
 * Without Web Share for files (a laptop) it is an ordinary download. Returns what happened.
 */
export async function shareCalendar(
  text: string,
  filename = 'my-day-ai.ics',
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([text], filename, { type: 'text/calendar' })
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: 'My Day AI' })
      return 'shared'
    } catch (e) {
      // the user closed the share sheet: that is an answer, not an error
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  downloadText(filename, text)
  return 'downloaded'
}

export function downloadText(filename: string, text: string, mime = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
