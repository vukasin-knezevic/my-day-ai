import type { AppData } from '../../types'
import { CATEGORY_META } from '../../types'
import { WEEKDAY_NAMES, addDaysStr, daysUntil, formatShort, weekDates, weekdayOf } from '../dates'
import { buildAlerts, occurrencesOn } from '../schedule'
import { avgSleep } from '../life'
import { subjectPoints } from '../grades'
import { computeStreaks, ps5Balance } from '../xp'
import { workoutsInWeek, proteinOn } from '../workout'
import { SCHEMA_TEXT, type AiKind } from './schemas'

export type Tone = 'friendly' | 'strict' | 'support'

/** The assistant's tone rules (used in the API system prompt AND at the top of manual prompts). */
export const SYSTEM_PROMPT = `Ti si lični asistent za planiranje dana studenta prve godine elektrotehnike. Pišeš na srpskom (latinica), kratko, sa emotikonima.

TON (biraj prema situaciji):
- Drugarski i kratak kad je sve u redu.
- Strog, direktan i bez izgovora kad preskače obaveze, kad je kolokvijum neprijavljen ili je rok blizu.
- Smiren i podržavajući kad je umoran, malo spava ili je teška nedelja.
Nikad ne grdi zbog igranja igrica na PS5; igranje je nagrada posle učenja.

PRAVILA PLANIRANJA:
- Ništa pre buđenja ni posle vremena spavanja.
- Najviše 3 h učenja zaredom, pa pauza (bar 30 min).
- Teži ispit i bliži rok = više učenja ranije.
- Dan pred kolokvijum trening skrati ili pomeri i objasni zašto.
- Bar jedan lakši dan u nedelji.
- Termini sa faksa koje student ne pohađa su slobodno vreme.
- Igre predlaži kao nagradu posle učenja.
- Koristi samo podatke koje dobiješ; ne izmišljaj predmete, rokove ni raspored.
Kad tražim JSON, vrati ga u JEDNOM bloku koda (\`\`\`json) tačno po zadatoj šemi.`

/** Which tone fits the data. Pure and testable. */
export function toneHint(data: AppData, today: string): Tone {
  const alerts = buildAlerts(data, today)
  const avg = avgSleep(data.sleep, today)
  const lowSleep = avg !== null && avg < 6
  const skipped = data.activities.filter(
    (a) =>
      a.status === 'skipped' ||
      (a.skippedDates ?? []).some((d) => daysUntil(today, d) >= 0 && daysUntil(today, d) <= 3),
  ).length
  if (lowSleep) return 'support'
  if (alerts.some((a) => a.level === 'red') || skipped >= 3) return 'strict'
  return 'friendly'
}

const TONE_TEXT: Record<Tone, string> = {
  friendly: 'drugarski i kratak (sve je u redu)',
  strict:
    'STROG i direktan, bez izgovora (ima neprijavljen kolokvijum / blizak rok / preskočene obaveze)',
  support: 'SMIREN i podržavajući (malo sna ili težak period)',
}

/** Compact text with this week's data. Contains only what the user entered. */
export function buildContext(data: AppData, today: string): string {
  const s = data.settings
  const lines: string[] = []
  lines.push(`Danas: ${today} (${WEEKDAY_NAMES[weekdayOf(today)]}).`)
  lines.push(
    `Ime: ${s.name || 'nepoznato'}. Budim se ${s.wakeTime}, spavam oko ${s.bedTime}. Cilj sna ${s.sleepGoalHours} h.`,
  )
  lines.push(
    `Ciljevi: ${s.workoutsPerWeek} treninga nedeljno, ${s.studyHoursPerDay} h učenja dnevno, ${s.proteinGoal} g proteina dnevno.`,
  )
  lines.push(`Predloženi ton danas: ${TONE_TEXT[toneHint(data, today)]}.`)
  lines.push('\nOBAVEZE OVE NEDELJE:')
  for (const d of weekDates(today)) {
    const occ = occurrencesOn(data, d).filter((o) => !o.suggested && o.status !== 'skipped')
    const txt = occ.length
      ? occ
          .map(
            (o) =>
              `${o.start}-${o.end} ${CATEGORY_META[o.category].label}: ${o.title}${o.status === 'done' ? ' (urađeno)' : ''}`,
          )
          .join('; ')
      : 'nema'
    lines.push(`- ${d} ${WEEKDAY_NAMES[weekdayOf(d)]}: ${txt}`)
  }
  const free = data.subjects.flatMap((sub) =>
    sub.slots
      .filter((x) => x.attendance === 'ne-idem')
      .map((x) => `${WEEKDAY_NAMES[x.day]} ${x.start}-${x.end} (${sub.name}, ne idem = slobodno)`),
  )
  if (free.length) lines.push('\nSLOBODNO VREME (termini koje preskačem): ' + free.join('; '))
  lines.push('\nKOLOKVIJUMI, ISPITI, DOMAĆI (narednih 30 dana):')
  const up = data.assessments
    .filter((a) => daysUntil(a.date, today) >= 0 && daysUntil(a.date, today) <= 30)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!up.length) lines.push('- nema unetih')
  for (const a of up) {
    const sub = data.subjects.find((x) => x.id === a.subjectId)?.name ?? '?'
    lines.push(
      `- ${a.date} ${a.title} (${sub}, ${a.type}), težina ${a.difficulty}/5, procena učenja ${a.studyHours} h, prijava: ${a.registration}${a.registrationDeadline ? `, rok prijave ${a.registrationDeadline}` : ''}`,
    )
  }
  const pts = data.subjects
    .map((sub) => ({ sub, p: subjectPoints(sub, data.assessments) }))
    .filter((x) => x.p.maxTotal > 0)
  if (pts.length)
    lines.push(
      '\nPOENI: ' +
        pts
          .map(
            ({ sub, p }) =>
              `${sub.name} ${p.earned}/${p.maxGraded} (fali do prolaza ${p.missingToPass})`,
          )
          .join('; '),
    )
  const avg = avgSleep(data.sleep, today)
  lines.push(`\nSAN: prosek 7 dana ${avg ?? 'nema podataka'} h.`)
  const st = computeStreaks(data, today)
  lines.push(
    `TRENING: ${workoutsInWeek(data.workouts, today).length} ove nedelje; nizovi dana: učenje ${st.study}, trening ${st.workout}, san ${st.sleep}, navike ${st.habits}.`,
  )
  lines.push(`ISHRANA: protein danas ${proteinOn(data.meals, today)} g.`)
  lines.push(
    `PS5 vreme: stanje ${ps5Balance(data.progress)} min (zarađeno ${data.progress.ps5EarnedMin}).`,
  )
  const alerts = buildAlerts(data, today)
  if (alerts.length) lines.push('\nUPOZORENJA: ' + alerts.map((a) => a.text).join(' | '))
  return lines.join('\n')
}

const TASKS: Record<AiKind, (today: string, text: string) => string> = {
  'plan-dana': (t) =>
    `ZADATAK: Napravi plan za DANAS (${t}). Rasporedi učenje, trening, odmor i igre. Poštuj postojeće obaveze (ne preklapaj ih).`,
  'plan-nedelje': (t) =>
    `ZADATAK: Napravi plan od ${t} do kraja nedelje (do ${addDaysStr(t, 7 - weekdayOf(t))}). Poštuj postojeće obaveze (ne preklapaj ih), rokove i pravila planiranja.`,
  unos: (t, text) =>
    `ZADATAK: Pretvori ovaj slobodan unos u aktivnosti. Današnji datum je ${t}. Unos: „${text}"`,
  rezime: () =>
    'ZADATAK: Napravi kratak rezime protekle nedelje (šta je išlo dobro, šta nije) i 3 konkretna saveta za sledeću.',
  uvoz: (_t, text) =>
    `ZADATAK: Iz teksta ispod izvuci kolokvijume, ispite, domaće i lab vežbe sa datumima. Ako nema godine, uzmi najbližu budućnost u odnosu na današnji datum. Ne izmišljaj ono čega nema u tekstu.\nTEKST:\n${text}`,
  trening: () =>
    'ZADATAK: Napravi plan treninga u teretani za mene (cilj, iskustvo i broj treninga nedeljno su u podacima iznad; rasporedi dane tako da ne smetaju faksu). Dani su 1=ponedeljak … 7=nedelja.',
}

export const MANUAL_QUESTIONS = `PRE NEGO ŠTO VRATIŠ PLAN: prvo mi postavi 3–5 kratkih pitanja (kako sam spavao, kako se osećam, da li idem na predavanja, šta je hitno) i sačekaj moje odgovore. Tek posle toga vrati rezultat.`

/** Full prompt text. In manual mode it also asks Claude to ask questions first. */
export function buildPrompt(
  kind: AiKind,
  data: AppData,
  today: string,
  opts: { manual: boolean; text?: string } = { manual: false },
): { system: string; user: string; manualText: string } {
  const user = [
    buildContext(data, today),
    '',
    TASKS[kind](today, opts.text ?? ''),
    '',
    'ŠEMA ODGOVORA (JSON, u jednom bloku koda):',
    SCHEMA_TEXT[kind],
  ].join('\n')
  const manualText = [
    SYSTEM_PROMPT,
    '',
    '--- MOJI PODACI ---',
    user,
    '',
    MANUAL_QUESTIONS,
    'Na kraju vrati JSON u bloku koda po šemi iznad.',
  ].join('\n')
  return { system: SYSTEM_PROMPT, user, manualText }
}

export const KIND_LABEL: Record<AiKind, string> = {
  'plan-dana': 'Plan dana',
  'plan-nedelje': 'Plan nedelje',
  unos: 'Pametan unos',
  rezime: 'Rezime nedelje',
  uvoz: 'Uvoz rasporeda kolokvijuma',
  trening: 'Plan treninga',
}

export { formatShort }
