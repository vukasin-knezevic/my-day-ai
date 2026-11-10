import { DATA_VERSION, DEFAULT_SETTINGS, emptyData, normalizeData } from './defaults'
import type { AppData } from '../types'

const load = (raw: unknown) => normalizeData(raw as Partial<AppData>)

describe('normalizeData repairs damaged saved data (A-15)', () => {
  it('nothing saved, or not an object: empty data', () => {
    for (const raw of [null, undefined, 5, 'x', []]) expect(load(raw)).toEqual(emptyData())
  })

  it('settings of the wrong type fall back to the defaults, the good ones stay', () => {
    const d = load({
      settings: {
        name: 'Mila',
        wakeTime: 'rano',
        bedTime: 7,
        sleepGoalHours: 'osam',
        proteinGoal: Number.NaN,
        theme: 'pink',
        gender: 'x',
        timeFormat: 12,
        aiMode: null,
        reminders: 'da',
        customAssessmentKinds: 'Seminarski',
        customSlotKinds: ['Mentorski', 4, null],
        onboarded: true,
      },
    })
    expect(d.settings).toEqual({
      ...DEFAULT_SETTINGS,
      name: 'Mila',
      customSlotKinds: ['Mentorski'],
      onboarded: true,
      // finished the setup before the tour existed: never sent through it
      tutorialDone: true,
    })
  })

  it('settings that are not an object at all: defaults', () => {
    expect(load({ settings: 'x' }).settings).toMatchObject({ wakeTime: '09:00', theme: 'system' })
    expect(load({ settings: null }).settings).toEqual(DEFAULT_SETTINGS)
  })

  it('progress: wrong types fall back, damaged events and ids are dropped', () => {
    const good = { id: 'e1', date: '2026-11-06', reason: 'x', xp: 10, category: 'faks' }
    const d = load({
      progress: {
        xp: '120',
        events: [good, null, 'x', { id: 'e2' }, { id: 'e3', date: '2026-11-06', xp: 'mnogo' }],
        rewardEarnedMin: 30,
        rewardSpentMin: 'x',
        awarded: ['a', 5, null],
      },
    })
    expect(d.progress).toEqual({
      xp: 0,
      events: [good],
      rewardEarnedMin: 30,
      rewardSpentMin: 0,
      awarded: ['a'],
    })
    expect(load({ progress: { events: 'x', awarded: {} } }).progress).toEqual(emptyData().progress)
    expect(load({ progress: 7 }).progress).toEqual(emptyData().progress)
  })

  it('lists: something that is not a list becomes empty, items without an id are dropped', () => {
    const d = load({
      subjects: 'x',
      habits: [{ id: 'h', name: 'Voda', goal: 8, entries: {} }, null, 3, { name: 'bez id' }],
      budget: 'x',
      workoutPlan: 'x',
      aiUsage: { month: 5, calls: 3 },
    })
    expect(d.subjects).toEqual([])
    expect(d.habits).toHaveLength(1)
    expect(d.budget).toEqual({})
    expect(d.workoutPlan).toBeNull()
    expect(d.aiUsage).toEqual({ month: '', inputTokens: 0, outputTokens: 0, calls: 3 })
  })

  it('damaged kinds in the settings do not stop the migration of old kinds', () => {
    const d = load({
      assessments: [{ id: 'a', subjectId: 's', type: 'domaci', title: 'D1', date: '2026-11-06' }],
      settings: { customAssessmentKinds: 5, language: 'sr-Latn' },
    })
    expect(d.assessments[0].type).toBe('Domaći')
    expect(d.settings.customAssessmentKinds).toEqual(['Domaći'])
  })

  it('good data passes through unchanged, and twice gives the same', () => {
    const d = load({
      settings: { name: 'Mila', wakeTime: '07:30', theme: 'dark', unknownFutureField: 1 },
      progress: { xp: 50, rewardEarnedMin: 20, rewardSpentMin: 5 },
    })
    expect(d.settings).toMatchObject({ name: 'Mila', wakeTime: '07:30', theme: 'dark' })
    expect((d.settings as unknown as Record<string, unknown>).unknownFutureField).toBe(1)
    expect(d.progress).toMatchObject({ xp: 50, rewardEarnedMin: 20, rewardSpentMin: 5 })
    expect(normalizeData(d)).toEqual(d)
  })

  it('the data version of update 0.4 is 4', () => {
    expect(DATA_VERSION).toBe(4)
  })
})
