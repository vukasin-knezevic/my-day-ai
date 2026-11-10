// The daily challenge: one small thing, chosen from the user's own data. The choice depends only on
// the date (and on "give me another"), so it is the same on every screen and in the tests.
import type { AppData } from '../types'
import { timeToMin } from './dates'
import { isExam } from './exams'
import { hashStr } from './hash'
import { habitDone } from './life'
import { doneDates } from './schedule'
import { formatTimeOfDay } from './dates'
import { t } from '../i18n'

export const CHALLENGE_XP = 15

export interface Challenge {
  id: string
  /** Done by itself when the app can see it; otherwise the user taps "Done". */
  auto: boolean
  text: string
  done: boolean
}

type Candidate = Omit<Challenge, 'done'> & { check: () => boolean }

function candidates(data: AppData, today: string, includeRegistered = false): Candidate[] {
  const out: Candidate[] = []
  for (const a of data.assessments) {
    if (
      isExam(a) &&
      a.date >= today &&
      (a.registration === 'nije-prijavljen' ||
        (includeRegistered && a.registration === 'prijavljen'))
    )
      out.push({
        id: `register-${a.id}`,
        auto: true,
        text: t('chal.register', { title: a.title }),
        check: () => a.registration === 'prijavljen',
      })
  }
  out.push({
    id: 'study-early',
    auto: true,
    text: t('chal.studyEarly'),
    check: () =>
      data.activities.some(
        (a) =>
          a.category === 'study' && timeToMin(a.start) < 14 * 60 && doneDates(a).includes(today),
      ),
  })
  for (const h of data.habits) {
    out.push({
      id: `habit-${h.id}`,
      auto: true,
      text: t('chal.habit', { name: h.name }),
      check: () => habitDone(h, today),
    })
  }
  out.push({
    id: 'bed',
    auto: false,
    text: t('chal.bed', { time: formatTimeOfDay(data.settings.bedTime) }),
    check: () => false,
  })
  out.push({ id: 'walk', auto: false, text: t('chal.walk'), check: () => false })
  return out
}

/** The challenge of a day. `skips` = how many times "give me another" was used (0 or 1). */
export function challengeFor(data: AppData, today: string): Challenge {
  const list = candidates(data, today)
  const skips = data.days[today]?.challengeSkips ?? 0
  let at = hashStr(`${today}#${skips}`) % list.length
  // "another" is never the same one again
  if (skips > 0 && list.length > 1 && list[at].id === list[hashStr(`${today}#0`) % list.length].id)
    at = (at + 1) % list.length
  // once chosen it stays (a registered exam leaves the list, but it is still today's challenge)
  const kept = data.days[today]?.challengeId
  const pick = (kept && candidates(data, today, true).find((c) => c.id === kept)) || list[at]
  const done = data.days[today]?.challengeDone === true || (pick.auto && pick.check())
  return { id: pick.id, auto: pick.auto, text: pick.text, done }
}
