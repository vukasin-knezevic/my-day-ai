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
