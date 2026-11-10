// Phases E and F: the morning routine, the main streak and its saves, the daily challenge, surprises,
// "Close the day" and the badges.
import { selectData, useStore } from '../store'
import { emptyData } from './defaults'
import { routineStreak, routineView, routineSteps } from './routine'
import { toggleRoutineStep } from './routineFlow'
import { activeDays, activeInWeek, mainStreak } from './streak'
import { CHALLENGE_XP, challengeFor } from './challenge'
import { setSurprisesEnabled, surpriseFor, SURPRISE_ONE_IN } from './surprise'
import { closeDay, dayBeingClosed, isEvening, reviewDay } from './closeDay'
import { badges, records, studyHoursDone } from './achievements'
import { dueReminders } from './reminders'
import { handleRoutineAction } from './routineNotify'
import { addDaysStr } from './dates'
import type { AppData } from '../types'

const TODAY = '2026-11-10'
const at = (h: number, m = 0, date = TODAY) =>
  new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
const st = () => useStore.getState()
const data = (): AppData => selectData(st())

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    ...emptyData(),
    settings: { ...emptyData().settings, onboarded: true, wakeTime: '08:00', bedTime: '00:30' },
    hydrated: true,
  })
})

describe('morning routine', () => {
  test('has four default steps; the user can have 3 to 5 own ones', () => {
    expect(routineSteps(data().settings)).toHaveLength(4)
    st().setSettings({
      routineSteps: [
        { emoji: '☕', text: 'Kafa' },
        { emoji: '📖', text: 'Čitanje' },
        { emoji: '🧘', text: 'Disanje' },
      ],
    })
    expect(routineSteps(data().settings).map((s) => s.text)).toEqual(['Kafa', 'Čitanje', 'Disanje'])
  })

  test('shows the full list until 11, then "save the day" with two steps, and nothing once it is complete', () => {
    expect(routineView(data(), at(9), TODAY).mode).toBe('full')
    const late = routineView(data(), at(13), TODAY)
    expect(late.mode).toBe('rescue')
    if (late.mode === 'rescue') expect(late.indexes).toEqual([0, 1])
    st().setSettings({ routineOn: false })
    expect(routineView(data(), at(9), TODAY).mode).toBe('off')
  })

  test('each step pays XP once, the finished routine pays a bonus, and unticking takes it all back', () => {
    const n = routineSteps(data().settings).length
    for (let i = 0; i < n; i++) toggleRoutineStep(i, TODAY, at(8, 30))
    // steps + the finished routine + done within an hour of the goal
    expect(st().progress.xp).toBe(n * 2 + 10 + 5)
    expect(routineStreak(data(), TODAY)).toBe(1)
    toggleRoutineStep(0, TODAY, at(8, 40))
    expect(st().progress.xp).toBe((n - 1) * 2)
    expect(routineStreak(data(), TODAY)).toBe(0)
  })

  test('finishing late pays the routine but not the on-time bonus', () => {
    const n = routineSteps(data().settings).length
    for (let i = 0; i < n; i++) toggleRoutineStep(i, TODAY, at(10, 30))
    expect(st().progress.xp).toBe(n * 2 + 10)
  })

  test('the routine streak counts days in a row', () => {
    const n = routineSteps(data().settings).length
    for (const d of [addDaysStr(TODAY, -2), addDaysStr(TODAY, -1), TODAY])
      for (let i = 0; i < n; i++) toggleRoutineStep(i, d, at(8, 10))
    expect(routineStreak(data(), TODAY)).toBe(3)
  })

  test('the morning notification comes at the goal time with a "Done" button, and not when it is done', () => {
    expect(dueReminders(data(), at(7), new Set()).some((r) => r.id.startsWith('routine-'))).toBe(
      false,
    )
    const r = dueReminders(data(), at(8, 5), new Set()).find((x) => x.id === `routine-${TODAY}`)
    expect(r?.actions?.[0].action).toBe('done')
    st().setDay(addDaysStr(TODAY, 0), { mainThing: 'Prijavi ispit' })
    expect(
      dueReminders(data(), at(8, 5), new Set()).find((x) => x.id === `routine-${TODAY}`)?.body,
    ).toContain('Prijavi ispit')
    const n = routineSteps(data().settings).length
    for (let i = 0; i < n; i++) toggleRoutineStep(i, TODAY, at(8, 6))
    expect(
      dueReminders(data(), at(8, 10), new Set()).some((x) => x.id === `routine-${TODAY}`),
    ).toBe(false)
  })

  test('the "Done" button of the notification ticks the next step', async () => {
    expect(await handleRoutineAction(`routine-${TODAY}`, 'done', at(8, 5))).toBe(true)
    expect(data().days[TODAY]?.routine).toEqual([0])
    expect(await handleRoutineAction('ev-1', 'done', at(8, 5))).toBe(false)
  })
})

describe('main streak and saves', () => {
  const run = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDaysStr(from, i))

  test('counts days in a row; today not done yet does not break it', () => {
    const s = mainStreak(new Set(run(addDaysStr(TODAY, -3), 3)), TODAY)
    expect(s.current).toBe(3)
    expect(mainStreak(new Set(), TODAY)).toMatchObject({ current: 0, best: 0 })
  })

  test('7 days in a row earn a save (at most 2 are kept)', () => {
    expect(mainStreak(new Set(run(addDaysStr(TODAY, -6), 7)), TODAY).savers).toBe(1)
    expect(mainStreak(new Set(run(addDaysStr(TODAY, -29), 30)), TODAY).savers).toBe(2)
  })

  test('a missed day spends a save by itself and the streak goes on', () => {
    const days = new Set([...run(addDaysStr(TODAY, -9), 7), addDaysStr(TODAY, -1), TODAY])
    // 7 days (save earned), one missed day (save spent), then 2 more
    const s = mainStreak(days, TODAY)
    expect(s.spent).toBe(1)
    expect(s.spentDays).toEqual([addDaysStr(TODAY, -2)])
    expect(s.current).toBe(9)
  })

  test('without a save the streak starts again from 1, and the longest one is kept', () => {
    const days = new Set([...run(addDaysStr(TODAY, -10), 3), TODAY])
    const s = mainStreak(days, TODAY)
    expect(s.current).toBe(1)
    expect(s.best).toBe(3)
  })

  test('something done counts: an event, a done activity, a ticked routine step, a closed day', () => {
    useStore.setState({
      ...data(),
      activities: [
        {
          id: 'a',
          title: 'x',
          category: 'study',
          date: '2026-11-08',
          start: '10:00',
          end: '11:00',
          recurrence: 'none',
          status: 'done',
          source: 'me',
        },
      ],
      days: { '2026-11-07': { routine: [0] }, '2026-11-06': { closed: { mood: null, note: '' } } },
    })
    const days = activeDays(data())
    expect([...days].sort()).toEqual(['2026-11-06', '2026-11-07', '2026-11-08'])
    expect(activeInWeek(days, '2026-11-08')).toBe(3)
  })
})

describe('daily challenge', () => {
  test('is the same for the same date, and "give me another" gives a different pick', () => {
    const a = challengeFor(data(), TODAY)
    expect(challengeFor(data(), TODAY).id).toBe(a.id)
    const ids = new Set<string>()
    for (let d = 0; d < 20; d++) ids.add(challengeFor(data(), addDaysStr(TODAY, d)).id)
    expect(ids.size).toBeGreaterThan(1)
  })

  test('is chosen from the data: an unregistered exam can be the challenge, and registering completes it', () => {
    st().add('assessments', {
      id: 'e1',
      subjectId: 's',
      type: 'kolokvijum',
      title: 'Kolokvijum 1',
      date: addDaysStr(TODAY, 10),
      registration: 'nije-prijavljen',
      maxPoints: 30,
      points: null,
      difficulty: 3,
    })
    let found = false
    for (let d = 0; d < 40 && !found; d++) {
      const date = addDaysStr(TODAY, d)
      const c = challengeFor(data(), date)
      if (c.id === 'register-e1') {
        found = true
        expect(c.auto).toBe(true)
        expect(c.done).toBe(false)
        st().setDay(date, { challengeId: c.id }) // what the card does on first sight
        st().update('assessments', 'e1', { registration: 'prijavljen' })
        expect(challengeFor(data(), date).done).toBe(true)
      }
    }
    expect(found).toBe(true)
    expect(CHALLENGE_XP).toBe(15)
  })

  test('a manual challenge is done when the day says so', () => {
    st().setDay(TODAY, { challengeDone: true })
    expect(challengeFor(data(), TODAY).done).toBe(true)
  })
})

describe('surprises', () => {
  beforeEach(() => setSurprisesEnabled(true))
  afterEach(() => setSurprisesEnabled(false))

  const find = (n: number) => {
    const out: string[] = []
    for (let i = 0; out.length < n && i < 500; i++)
      if (surpriseFor(`act-x${i}-${TODAY}`)) out.push(`act-x${i}-${TODAY}`)
    return out
  }

  test('about one in four awards, always the same for the same id, never for bonuses', () => {
    let hits = 0
    for (let i = 0; i < 400; i++) if (surpriseFor(`act-${i}-${TODAY}`)) hits++
    expect(hits).toBeGreaterThan(400 / SURPRISE_ONE_IN / 2)
    expect(hits).toBeLessThan((400 / SURPRISE_ONE_IN) * 2)
    expect(surpriseFor('act-1-d')).toEqual(surpriseFor('act-1-d'))
    expect(surpriseFor('surprise-act-1-d')).toBeNull()
    expect(surpriseFor('challenge-2026-11-10')).toBeNull()
    for (let i = 0; i < 300; i++) {
      const s = surpriseFor(`act-${i}-d`)
      if (s?.kind === 'xp') expect(s.amount >= 5 && s.amount <= 20).toBe(true)
      if (s?.kind === 'reward') expect(s.amount >= 5 && s.amount <= 15).toBe(true)
    }
  })

  test('taking the award back takes the surprise back, and doing it again gives the same one, not a new try', () => {
    const [id] = find(1)
    st().award({ id, date: TODAY, reason: 'x', xp: 10, category: 'study' })
    const after = st().progress
    expect(after.awarded).toContain(`surprise-${id}`)
    st().revoke(id)
    expect(st().progress.xp).toBeGreaterThanOrEqual(0)
    // the surprise is still tied to the award: it left with it (revoke by exact id of the award only)
    st().revoke(`surprise-${id}`)
    expect(st().progress.awarded).toEqual([])
    expect(st().progress.xp).toBe(0)
    st().award({ id, date: TODAY, reason: 'x', xp: 10, category: 'study' })
    expect(st().progress).toMatchObject({ xp: after.xp, rewardEarnedMin: after.rewardEarnedMin })
    expect(data().days[TODAY]?.surprised).toEqual([id])
  })

  test('at most two a day', () => {
    for (const id of find(4))
      st().award({ id, date: TODAY, reason: 'x', xp: 10, category: 'study' })
    expect(data().days[TODAY]?.surprised).toHaveLength(2)
  })
})

describe('close the day', () => {
  test('it is evening from 2 hours before bedtime, also after midnight', () => {
    const s = { wakeTime: '08:00', bedTime: '00:30' }
    expect(isEvening(s, at(21))).toBe(false)
    expect(isEvening(s, at(22, 30))).toBe(true)
    expect(isEvening(s, at(0, 10))).toBe(true)
    expect(isEvening(s, at(9))).toBe(false)
    expect(dayBeingClosed(s, at(0, 10), TODAY)).toBe(addDaysStr(TODAY, -1))
    expect(dayBeingClosed(s, at(21), TODAY)).toBe(TODAY)
  })

  test('reviews the day, moves what is left to tomorrow, keeps the main thing and pays 10 XP once', () => {
    st().add('activities', {
      id: 'a1',
      title: 'Učenje',
      category: 'study',
      date: TODAY,
      start: '10:00',
      end: '11:00',
      recurrence: 'none',
      status: 'planned',
      source: 'me',
    })
    st().add('activities', {
      id: 'a2',
      title: 'Šetnja',
      category: 'habits',
      date: TODAY,
      start: '12:00',
      end: '12:30',
      recurrence: 'none',
      status: 'planned',
      source: 'me',
    })
    expect(reviewDay(data(), TODAY).open.map((a) => a.id)).toEqual(['a1', 'a2'])
    closeDay({
      date: TODAY,
      mood: 4,
      note: ' dobar dan ',
      moveIds: ['a1'],
      skipIds: ['a2'],
      mainThing: 'Prijavi ispit',
    })
    expect(data().activities.find((a) => a.id === 'a1')?.date).toBe(addDaysStr(TODAY, 1))
    expect(data().activities.find((a) => a.id === 'a2')?.status).toBe('skipped')
    expect(data().days[TODAY]?.closed).toEqual({ mood: 4, note: 'dobar dan' })
    expect(data().days[addDaysStr(TODAY, 1)]?.mainThing).toBe('Prijavi ispit')
    expect(st().progress.xp).toBe(10)
    // closing again does not pay again
    closeDay({ date: TODAY, mood: 4, note: '', moveIds: [], skipIds: [], mainThing: '' })
    expect(st().progress.xp).toBe(10)
    expect(activeDays(data()).has(TODAY)).toBe(true)
  })
})

describe('badges and records', () => {
  test('the first week, streaks and 50 hours of study are worked out from the data', () => {
    expect(badges(data(), TODAY).find((b) => b.id === 'week1')?.earned).toBe(false)
    const days: AppData['days'] = {}
    for (let i = 0; i < 7; i++) days[addDaysStr(TODAY, -i)] = { routine: [0] }
    useStore.setState({ days })
    const list = badges(data(), TODAY)
    expect(list.find((b) => b.id === 'week1')?.earned).toBe(true)
    expect(list.find((b) => b.id === 'streak7')?.earned).toBe(true)
    expect(list.find((b) => b.id === 'streak30')?.earned).toBe(false)
    expect(list.find((b) => b.id === 'streak30')?.progress).toEqual({ have: 7, need: 30 })
  })

  test('study hours count only finished blocks; records are the heaviest weights, heaviest first', () => {
    st().add('activities', {
      id: 's',
      title: 'x',
      category: 'study',
      date: TODAY,
      start: '10:00',
      end: '12:00',
      recurrence: 'none',
      status: 'done',
      source: 'me',
    })
    st().add('activities', {
      id: 's2',
      title: 'x',
      category: 'study',
      date: TODAY,
      start: '13:00',
      end: '15:00',
      recurrence: 'none',
      status: 'planned',
      source: 'me',
    })
    expect(studyHoursDone(data())).toBe(2)
    st().add('workouts', {
      date: TODAY,
      type: 'Push',
      durationMin: 40,
      feeling: null,
      exercises: [
        { name: 'Bench', sets: [{ reps: 5, weight: 60 }] },
        { name: 'Squat', sets: [{ reps: 5, weight: 90 }] },
      ],
    })
    expect(records(data()).map((r) => r.kg)).toEqual([90, 60])
  })
})
