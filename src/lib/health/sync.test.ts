import { useStore } from '../../store'
import { emptyData } from '../defaults'
import { createMockSource } from './mock'
import { removeSleepLog, syncDue, syncHealth } from './sync'
import { nightId } from './sleepImport'

const NOW = new Date('2026-11-14T10:00:00')
const connect = (patch = {}) =>
  useStore.setState({
    ...emptyData(),
    hydrated: true,
    settings: { ...emptyData().settings, watchConnected: true, ...patch },
  })
const night = {
  id: 'r1',
  start: '2026-11-13T23:30:00',
  end: '2026-11-14T07:00:00',
  origin: 'com.huawei.health',
}

beforeEach(() => connect())

describe('syncDue', () => {
  it('first time, forced, or after 15 minutes', () => {
    expect(syncDue('', NOW)).toBe(true)
    expect(syncDue(new Date(NOW.getTime() - 5 * 60000).toISOString(), NOW)).toBe(false)
    expect(syncDue(new Date(NOW.getTime() - 5 * 60000).toISOString(), NOW, true)).toBe(true)
    expect(syncDue(new Date(NOW.getTime() - 15 * 60000).toISOString(), NOW)).toBe(true)
  })
})

describe('syncHealth', () => {
  it('does nothing when the watch is not connected', async () => {
    connect({ watchConnected: false })
    const r = await syncHealth(createMockSource(), { now: NOW })
    expect(r.skipped).toBe(true)
  })

  it('writes steps per day and imports the night once', async () => {
    const src = createMockSource({
      steps: { '2026-11-14': { a: 4200 } },
      sessions: [night],
    })
    const r1 = await syncHealth(src, { now: NOW, force: true })
    expect(r1).toMatchObject({ ok: true, addedNights: 1, stepsToday: 4200 })
    expect(useStore.getState().days['2026-11-14'].steps).toBe(4200)
    const r2 = await syncHealth(src, { now: NOW, force: true })
    expect(r2.addedNights).toBe(0)
    expect(useStore.getState().sleep).toHaveLength(1)
    expect(useStore.getState().sleep[0].source).toBe('watch')
  })

  it('the goal pays XP once per day, however many syncs', async () => {
    const src = createMockSource({ steps: { '2026-11-14': { a: 10500 } } })
    await syncHealth(src, { now: NOW, force: true })
    const xp = useStore.getState().progress.xp
    expect(xp).toBeGreaterThan(0)
    await syncHealth(src, { now: NOW, force: true })
    await syncHealth(src, { now: NOW, force: true })
    expect(useStore.getState().progress.xp).toBe(xp)
  })

  it('a failed read writes nothing and returns the error', async () => {
    const src = createMockSource({ failWith: 'boom' })
    const r = await syncHealth(src, { now: NOW, force: true })
    expect(r.ok).toBe(false)
    expect(r.error?.code).toBe('failed')
    expect(useStore.getState().settings.watchLastSync).toBe('')
    expect(useStore.getState().sleep).toEqual([])
  })

  it('a revoked permission is a typed "denied", not a crash', async () => {
    const src = createMockSource({ permissions: { steps: false, sleep: true } })
    const r = await syncHealth(src, { now: NOW, force: true })
    expect(r.error?.code).toBe('denied')
  })

  it('only the chosen source is read', async () => {
    connect({ watchSource: 'b' })
    const src = createMockSource({ steps: { '2026-11-14': { a: 9000, b: 100 } } })
    const r = await syncHealth(src, { now: NOW, force: true })
    expect(r.stepsToday).toBe(100)
  })

  it('a manual night wins over the watch', async () => {
    useStore.getState().add('sleep', {
      date: '2026-11-14',
      bedtime: '2026-11-14T00:30:00',
      wakeTime: '2026-11-14T08:00:00',
      quality: 4,
      source: 'manual',
    })
    await syncHealth(createMockSource({ sessions: [night] }), { now: NOW, force: true })
    expect(useStore.getState().sleep).toHaveLength(1)
    expect(useStore.getState().sleep[0].source).toBe('manual')
  })

  it('a deleted watch night does not come back on the next sync', async () => {
    const src = createMockSource({ sessions: [night] })
    await syncHealth(src, { now: NOW, force: true })
    const id = nightId(night.start)
    removeSleepLog(id)
    expect(useStore.getState().sleep).toEqual([])
    await syncHealth(src, { now: NOW, force: true })
    expect(useStore.getState().sleep).toEqual([])
    expect(useStore.getState().settings.dismissedSleepIds).toContain(id)
  })
})
