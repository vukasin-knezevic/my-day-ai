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
})
