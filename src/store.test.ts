import { useStore, selectData } from './store'
import { emptyData, normalizeData } from './lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

describe('store', () => {
  it('add / update / remove', () => {
    const { add, update, remove } = useStore.getState()
    const id = add('meals', { date: '2026-11-06', description: 'Jaja', protein: 20 })
    expect(useStore.getState().meals).toHaveLength(1)
    update('meals', id, { protein: 25 })
    expect(useStore.getState().meals[0].protein).toBe(25)
    remove('meals', id)
    expect(useStore.getState().meals).toHaveLength(0)
  })
  it('demo data can be loaded and cleared without touching real data', () => {
    const s = useStore.getState()
    s.add('meals', { date: '2026-11-06', description: 'Moj obrok', protein: 10 })
    s.loadDemo()
    expect(useStore.getState().hasDemo()).toBe(true)
    expect(useStore.getState().subjects.every((x) => x.name.includes('(primer)'))).toBe(true)
    useStore.getState().clearDemo()
    expect(useStore.getState().hasDemo()).toBe(false)
    expect(useStore.getState().meals).toHaveLength(1)
  })
  it('deleting a workout takes back its XP and record bonuses', () => {
    const s = useStore.getState()
    const id = s.add('workouts', {
      date: '2026-11-07',
      type: 'Gym',
      durationMin: 45,
      exercises: [],
      feeling: 3,
    })
    const ev = { date: '2026-11-07', reason: 'r', category: 'workout' as const }
    s.award({ ...ev, id: `workout-${id}`, xp: 30 })
    s.award({ ...ev, id: `pr-${id}-Bench`, xp: 15 })
    expect(useStore.getState().progress.xp).toBe(45)
    useStore.getState().remove('workouts', id)
    expect(useStore.getState().progress.xp).toBe(0)
    expect(useStore.getState().progress.events).toEqual([])
  })
  it('revoke by prefix takes back every award of a habit', () => {
    const s = useStore.getState()
    const ev = { date: '2026-11-07', reason: 'r', category: 'habits' as const, xp: 5 }
    s.award({ ...ev, id: 'habit-h1-2026-11-06' })
    s.award({ ...ev, id: 'habit-h1-2026-11-07' })
    useStore.getState().revoke('habit-h1-', { prefix: true })
    expect(useStore.getState().progress.xp).toBe(0)
  })
  it('clearing the demo also takes back the XP and reward minutes of demo items', () => {
    const s = useStore.getState()
    s.loadDemo()
    const demoWorkout = useStore.getState().workouts.find((w) => w.demo)!
    const own = s.add('workouts', {
      date: '2026-11-07',
      type: 'Moj',
      durationMin: 30,
      exercises: [],
      feeling: 3,
    })
    const ev = { date: '2026-11-07', reason: 'r', category: 'workout' as const, xp: 30 }
    useStore.getState().award({ ...ev, id: `workout-${demoWorkout.id}` })
    useStore.getState().award({ ...ev, id: `workout-${own}` })
    expect(useStore.getState().progress.xp).toBe(60)
    useStore.getState().clearDemo()
    expect(useStore.getState().progress.xp).toBe(30)
    expect(useStore.getState().progress.awarded).toEqual([`workout-${own}`])
  })
  it('loading the demo twice does not duplicate it', () => {
    useStore.getState().loadDemo()
    const once = useStore.getState().subjects.length
    useStore.getState().loadDemo()
    expect(useStore.getState().subjects).toHaveLength(once)
  })
  const exam = (subjectId: string, title: string) =>
    useStore.getState().add('assessments', {
      subjectId,
      type: 'kolokvijum',
      title,
      date: '2026-11-20',
      registration: 'nije-prijavljen',
      maxPoints: 30,
      points: null,
      difficulty: 3,
      studyHours: 6,
    })
  it('clearing the demo also removes what was added to a demo subject', () => {
    useStore.getState().loadDemo()
    exam(useStore.getState().subjects[0].id, 'Moj kolokvijum')
    useStore.getState().clearDemo()
    expect(useStore.getState().assessments).toHaveLength(0)
  })
  it('deleting a subject deletes its exams and only its exams', () => {
    const { add, removeSubject } = useStore.getState()
    const subject = (name: string) =>
      add('subjects', { name, color: '#000', espb: 6, passMark: 51, slots: [] })
    const math = subject('Mata')
    const physics = subject('Fizika')
    exam(math, 'K1')
    exam(physics, 'K2')
    removeSubject(math)
    expect(useStore.getState().subjects.map((s) => s.name)).toEqual(['Fizika'])
    expect(useStore.getState().assessments.map((a) => a.title)).toEqual(['K2'])
  })
  it('selectData has no functions', () => {
    const d = selectData(useStore.getState())
    expect(Object.values(d).some((v) => typeof v === 'function')).toBe(false)
    expect(d).toHaveProperty('settings')
  })
  it('normalizeData fills missing fields', () => {
    const d = normalizeData({ settings: { name: 'X' } as never })
    expect(d.settings.wakeTime).toBe('09:00')
    expect(d.subjects).toEqual([])
  })
  it('resetAll empties everything', () => {
    useStore.getState().loadDemo()
    useStore.getState().resetAll()
    expect(useStore.getState().subjects).toHaveLength(0)
    expect(useStore.getState().settings.onboarded).toBe(false)
  })
  it('A-33: data saved by an older version (persist version 1, 3) is still read and completed', async () => {
    const { set: idbSet } = await import('idb-keyval')
    const { allowWrites } = await import('./lib/storage')
    const { DATA_VERSION } = await import('./lib/defaults')
    expect(useStore.persist.getOptions().version).toBe(DATA_VERSION)
    await useStore.persist.rehydrate() // let the first read finish, so it cannot overwrite what is set below
    for (const version of [1, 3, DATA_VERSION]) {
      allowWrites(false)
      await idbSet(
        'my-day-ai',
        JSON.stringify({
          state: { meals: [{ id: 'm1', date: '2026-11-06', description: 'Jaja', protein: 20 }] },
          version,
        }),
      )
      useStore.setState({ ...emptyData() })
      await useStore.persist.rehydrate()
      expect(
        useStore.getState().meals.map((m) => m.id),
        `version ${version}`,
      ).toEqual(['m1'])
      // fields that did not exist then have their defaults
      expect(useStore.getState().days).toEqual({})
      expect(useStore.getState().settings.routineOn).toBe(true)
    }
  })
  it('a saved text that cannot be read is never overwritten; a later good read works again', async () => {
    const { get: idbGet, set: idbSet } = await import('idb-keyval')
    const { allowWrites, flushStorage } = await import('./lib/storage')
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    await useStore.persist.rehydrate()
    allowWrites(false)
    await flushStorage() // writes of the earlier tests that are still on their way
    await idbSet('my-day-ai', '{"state":{"meals":[{"id":"m1"') // cut in the middle
    useStore.setState({ ...emptyData(), hydrated: false, hydrationError: false })
    await useStore.persist.rehydrate()
    expect(useStore.getState().hydrationError).toBe(true)
    expect(useStore.getState().hydrated).toBe(false)
    // whatever the app does in this state, the damaged copy stays as it was (it may still be rescued)
    useStore.getState().add('meals', { date: '2026-11-06', description: 'x', protein: 1 })
    await flushStorage()
    expect(await idbGet('my-day-ai')).toBe('{"state":{"meals":[{"id":"m1"')
    quiet.mockRestore()
    await idbSet('my-day-ai', JSON.stringify({ state: { meals: [] }, version: 6 }))
    await useStore.persist.rehydrate()
    expect(useStore.getState().hydrationError).toBe(false)
    expect(useStore.getState().hydrated).toBe(true)
  })

  it('data saved by a NEWER version is read, and fields this version does not know are kept in items and settings', async () => {
    const { get: idbGet, set: idbSet } = await import('idb-keyval')
    const { allowWrites, flushStorage } = await import('./lib/storage')
    const { DATA_VERSION } = await import('./lib/defaults')
    await useStore.persist.rehydrate()
    allowWrites(false)
    await flushStorage() // writes of the earlier tests that are still on their way
    await idbSet(
      'my-day-ai',
      JSON.stringify({
        state: {
          meals: [{ id: 'm1', date: '2026-11-06', description: 'Jaja', protein: 20, future: 1 }],
          settings: { name: 'V', futureSetting: 'x' },
        },
        version: DATA_VERSION + 1,
      }),
    )
    useStore.setState({ ...emptyData() })
    await useStore.persist.rehydrate()
    useStore.getState().setSettings({ sound: true })
    await flushStorage()
    const saved = JSON.parse((await idbGet<string>('my-day-ai')) ?? '{}') as {
      state: { meals: Record<string, unknown>[]; settings: Record<string, unknown> }
    }
    expect(saved.state.meals[0]).toMatchObject({ id: 'm1', future: 1 })
    expect(saved.state.settings).toMatchObject({ name: 'V', futureSetting: 'x', sound: true })
  })
})
