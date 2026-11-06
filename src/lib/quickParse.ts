// Offline quick-entry parser. Turns a short sentence (Serbian or English) into a structured entry.
// Examples: "trening 18-19:30", "sutra učenje mata 2h", "kafa 200", "legao 1:30",
// "gym tomorrow 18-19:30", "study math 2h", "coffee 200", "slept 1:30".
import type { Category, ExpenseCategory, Weekday } from '../types'
import { t as tr } from '../i18n'
import { categoryLabel } from './labels'
import { addDaysStr, minToTime, timeToMin, todayStr, weekdayOf } from './dates'

export type Parsed =
  | {
      kind: 'activity'
      title: string
      category: Category
      date: string
      start: string
      end: string
    }
  | {
      kind: 'expense'
      amount: number
      description: string
      category: ExpenseCategory
      date: string
    }
  | { kind: 'sleep'; event: 'bed' | 'wake'; time: string; date: string }
  | { kind: 'unknown'; text: string }

/** Lowercase and strip Serbian diacritics. Each char maps to exactly one char, so indexes stay aligned. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd')
}

const WEEKDAY_WORDS: [RegExp, Weekday][] = [
  [/\b(ponedeljak|ponedeljka|pon)\b/, 1],
  [/\b(utorak|utorka|uto|uto\.)\b/, 2],
  [/\b(sreda|sredu|sre)\b/, 3],
  [/\b(cetvrtak|cetvrtka|cet)\b/, 4],
  [/\b(petak|petka|pet)\b/, 5],
  [/\b(subota|subotu|sub)\b/, 6],
  [/\b(nedelja|nedelju|ned)\b/, 7],
  // English
  [/\b(monday|mon)\b/, 1],
  [/\b(tuesday|tue|tues)\b/, 2],
  [/\b(wednesday|wed)\b/, 3],
  [/\b(thursday|thu|thur|thurs)\b/, 4],
  [/\b(friday|fri)\b/, 5],
  [/\b(saturday)\b/, 6],
  [/\b(sunday|sun)\b/, 7],
]

const ACTIVITY_WORDS: [RegExp, Category][] = [
  [
    /\b(trening|teretana|teretanu|gym|vezbe za|cardio|kardio|workout|training|exercise|running|run)\b/,
    'workout',
  ],
  [
    /\b(ucenje|ucim|uci|ucit|kolokvijum|ispit|predavanje|domaci|lab|mata|matematika|fizika|programiranje|study|studying|homework|lecture|exam|midterm|class|math|physics|programming|revision)\b/,
    'study',
  ],
  [/\b(spavanje|odmor|nap|dremka|spavam|sleep|rest)\b/, 'sleep'],
  [/\b(igra|igrica|igrice|ps5|fifa|gaming|igranje|game|games|playstation|xbox)\b/, 'games'],
  [/\b(dorucak|rucak|vecera|obrok|jelo|breakfast|lunch|dinner|meal)\b/, 'food'],
  [/\b(setnja|citanje|voda|meditacija|navika|walk|reading|water|meditation|habit)\b/, 'habits'],
]

const EXPENSE_WORDS: [RegExp, ExpenseCategory][] = [
  [
    /\b(kafa|kafu|rucak|dorucak|vecera|pica|pizza|burger|hrana|sendvic|pekara|market|pljeskavica|coffee|lunch|breakfast|dinner|food|sandwich|bakery|groceries)\b/,
    'hrana',
  ],
  [
    /\b(bus|taxi|taksi|prevoz|karta|gorivo|autobus|tramvaj|bajs|transport|ticket|fuel|tram|metro|uber)\b/,
    'prevoz',
  ],
  [/\b(igra|igrica|ps5|psn|steam|ps plus|fifa|game|games|xbox)\b/, 'igre'],
  [/\b(knjiga|skripta|stampanje|faks|indeks|zadatak|book|books|notes|printing|tuition)\b/, 'faks'],
  [/\b(pivo|izlazak|kafic|bioskop|klub|pice|zurka|beer|party|bar|club|cinema|drinks)\b/, 'izlasci'],
]

const DEFAULT_MINUTES: Record<Category, number> = {
  workout: 90,
  study: 60,
  sleep: 60,
  games: 60,
  food: 45,
  money: 15,
  habits: 30,
}

/** Mutable text holder: removes a matched span from both original and normalized text. */
class Text {
  constructor(
    public orig: string,
    public norm: string,
  ) {}
  cut(re: RegExp): RegExpExecArray | null {
    const m = re.exec(this.norm)
    if (!m) return null
    const i = m.index
    this.orig = this.orig.slice(0, i) + ' ' + this.orig.slice(i + m[0].length)
    this.norm = this.norm.slice(0, i) + ' ' + this.norm.slice(i + m[0].length)
    return m
  }
  has(re: RegExp): boolean {
    return re.test(this.norm)
  }
}

function parseDate(t: Text, now: Date): string | null {
  const today = todayStr(now)
  if (t.cut(/\b(prekosutra|day after tomorrow)\b/)) return addDaysStr(today, 2)
  if (t.cut(/\b(sutra|tomorrow|tmrw)\b/)) return addDaysStr(today, 1)
  if (t.cut(/\b(juce|jucer|yesterday)\b/)) return addDaysStr(today, -1)
  if (t.cut(/\b(danas|today)\b/)) return today
  const todayWd = weekdayOf(today)
  for (const [re, wd] of WEEKDAY_WORDS) {
    // optional preposition ("u" / "na" / "on") before the weekday name
    if (t.cut(new RegExp(`(?:\\b(?:u|na|on)\\s+)?${re.source}`))) {
      let diff = wd - todayWd
      if (diff <= 0) diff += 7
      return addDaysStr(today, diff)
    }
  }
  return null
}

const TIME = String.raw`(\d{1,2})(?:[:.](\d{2}))?`
const toMin = (h: string, m?: string) => Number(h) * 60 + (m ? Number(m) : 0)
const validTime = (min: number) => min >= 0 && min < 24 * 60

function parseAmount(raw: string): number {
  // "1.200" -> 1200, "200" -> 200
  return Number(raw.replace(/\.(?=\d{3}\b)/g, ''))
}

export function parseQuick(input: string, now: Date = new Date()): Parsed {
  const text = input.trim()
  if (!text) return { kind: 'unknown', text }
  const t = new Text(text, normalize(text))
  const today = todayStr(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // ---- sleep: "legao 1:30", "ustao 9", "legao" ----
  const sleepMatch = t.cut(
    /\b(legao|legla|lego|ustao|ustala|probudio|probudila|budan|went to bed|go(?:ing)? to bed|slept|woke up|woke|got up|awake)\b/,
  )
  if (sleepMatch) {
    const isBed = /^(leg|went to bed|go(?:ing)? to bed|slept)/.test(sleepMatch[0])
    const m = t.cut(new RegExp(String.raw`\b(?:(?:u|at)\s+)?${TIME}\s*h?\b`)) ?? null
    const min = m ? toMin(m[1], m[2]) : nowMin
    const date = parseDate(t, now) ?? today
    return {
      kind: 'sleep',
      event: isBed ? 'bed' : 'wake',
      time: minToTime(validTime(min) ? min : nowMin),
      date,
    }
  }

  const date = parseDate(t, now)

  // ---- time range: "18-19:30" / "18:00 - 19:30" ----
  let start: number | null = null
  let end: number | null = null
  let duration: number | null = null
  const range = t.cut(
    new RegExp(String.raw`\b(?:(?:od|from)\s+)?${TIME}\s*h?\s*(?:-|do|to|until)\s*${TIME}\s*h?\b`),
  )
  if (range) {
    const a = toMin(range[1], range[2])
    const b = toMin(range[3], range[4])
    if (validTime(a) && validTime(b)) {
      start = a
      end = b <= a ? b + 24 * 60 : b
    }
  }

  // ---- duration: "2h", "1.5h", "90 min", "2 sata" ----
  if (start === null) {
    const min = t.cut(/\b(\d+)\s*(?:min|minuta|minuti|minutes|minute|mins|m)\b/)
    if (min) duration = Number(min[1])
    else {
      const words = t.cut(/\b(\d+(?:[.,]\d+)?)\s*(?:sat|sata|sati|casa|cas|hours|hour|hrs|hr)\b/)
      if (words) duration = Math.round(Number(words[1].replace(',', '.')) * 60)
    }
  }

  // ---- single time: "u 18", "18:30", "18h" (h-number >= 9 is a time, smaller is a duration) ----
  if (start === null) {
    const withU = t.cut(new RegExp(String.raw`\b(?:u|od|oko|at|from|around)\s+${TIME}\s*h?\b`))
    const colon = withU ?? t.cut(/\b(\d{1,2}):(\d{2})\b/)
    if (colon) {
      const v = toMin(colon[1], colon[2])
      if (validTime(v)) start = v
    }
  }
  if (duration === null) {
    const h = t.cut(/\b(\d+(?:[.,]\d+)?)\s*h\b/)
    if (h) {
      const n = Number(h[1].replace(',', '.'))
      if (start === null && n >= 9 && n < 24 && Number.isInteger(n)) start = n * 60
      else duration = Math.round(n * 60)
    }
  }

  // ---- category ----
  let category: Category | null = null
  for (const [re, cat] of ACTIVITY_WORDS) {
    if (t.has(re)) {
      category = cat
      break
    }
  }

  // ---- expense: money words / "din" / bare number without any time info ----
  const dinMatch = t.cut(
    /\b(\d+(?:\.\d{3})*)\s*(?:din|dinara|dinar|rsd|eur|euro|euros|usd|dollars|dollar|gbp)\b/,
  )
  const bareNumber = /\b\d+(?:\.\d{3})*\b/.exec(t.norm)
  const hasTimeInfo = start !== null || duration !== null
  if (
    dinMatch ||
    (!hasTimeInfo && bareNumber && (category === null || Number(bareNumber[0]) > 24))
  ) {
    let amount: number
    if (dinMatch) amount = parseAmount(dinMatch[1])
    else {
      const m = t.cut(/\b\d+(?:\.\d{3})*\b/)!
      amount = parseAmount(m[0])
    }
    const description = cleanTitle(t.orig) || tr('quick.expense')
    let expCat: ExpenseCategory = 'ostalo'
    for (const [re, c] of EXPENSE_WORDS) {
      if (re.test(normalize(text))) {
        expCat = c
        break
      }
    }
    return { kind: 'expense', amount, description, category: expCat, date: date ?? today }
  }

  // ---- bare small number with an activity word: "trening 18" -> starts at 18:00 ----
  if (!hasTimeInfo && category) {
    const m = t.cut(/\b(\d{1,2})\b/)
    if (m && Number(m[1]) <= 24) start = Number(m[1]) * 60
  }

  if (!category && !hasTimeInfo) return { kind: 'unknown', text }
  const cat: Category = category ?? 'habits'

  // ---- compose the activity ----
  const targetDate = date ?? today
  if (start === null) {
    start = targetDate === today ? Math.min(Math.ceil((nowMin + 1) / 60) * 60, 23 * 60) : 18 * 60
  }
  if (end === null) end = start + (duration ?? DEFAULT_MINUTES[cat])
  const dayEnd = 24 * 60 - 1
  if (end > dayEnd) end = dayEnd
  const title = cleanTitle(t.orig) || categoryLabel(cat)
  return {
    kind: 'activity',
    title,
    category: cat,
    date: targetDate,
    start: minToTime(start),
    end: minToTime(Math.max(end, timeToMin(minToTime(start)) + 5)),
  }
}

function cleanTitle(s: string): string {
  const cleaned = s
    .replace(/\b(u|na|za|od|do|at|on|for|from|to|until)\b\s*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : ''
}
