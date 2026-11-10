import * as idb from 'idb-keyval'
import { initUpdates, updateEvents, useUpdate } from './updates'
import { pwaTest } from '../test/pwa-register'
import { allowWrites, idbStorage } from './storage'

vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))

/** A fake service worker registration: enough to play "a new worker is installing". */
function fakeRegistration() {
  const listeners: Record<string, () => void> = {}
  const worker = {
    state: 'installing',
    onState: () => {},
    addEventListener: (_: string, cb: () => void) => {
      worker.onState = cb
    },
  }
  const registration = {
    installing: worker as unknown as ServiceWorker | null,
    addEventListener: (type: string, cb: () => void) => {
      listeners[type] = cb
    },
    update: vi.fn(() => Promise.resolve()),
  }
  return { registration, worker, fire: (type: string) => listeners[type]?.() }
}

function setController(value: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { controller: value },
  })
}

function start(autoUpdate = true) {
  const fake = fakeRegistration()
  initUpdates(() => autoUpdate)
  pwaTest.options!.onRegisteredSW!(
    'sw.js',
    fake.registration as unknown as ServiceWorkerRegistration,
  )
  return fake
}

const tick = () => new Promise((r) => setTimeout(r, 5))

beforeEach(() => {
  vi.useFakeTimers()
  pwaTest.updateCalls.length = 0
  useUpdate.setState({ phase: 'idle', progress: 0 })
})
afterEach(() => vi.useRealTimers())

describe('updates', () => {
  it('A-01: the first install of the service worker is not an update (nothing is shown)', () => {
    setController(null)
    const { fire } = start()
    fire('updatefound')
    vi.advanceTimersByTime(30_000)
    expect(useUpdate.getState().phase).toBe('idle')
  })

  it('a new version: downloading with an estimate below 100%, then ready', () => {
    setController({})
    const { fire, worker } = start()
    fire('updatefound')
    expect(useUpdate.getState().phase).toBe('downloading')
    vi.advanceTimersByTime(60_000)
    expect(useUpdate.getState().progress).toBeLessThanOrEqual(90)
    worker.state = 'installed'
    worker.onState()
    expect(useUpdate.getState()).toMatchObject({ phase: 'ready', progress: 100 })
  })

  it('no installing worker: nothing happens', () => {
    setController({})
    const { fire, registration } = start()
    registration.installing = null
    fire('updatefound')
    expect(useUpdate.getState().phase).toBe('idle')
  })

  it('onNeedRefresh marks the version as ready and the estimate stops', () => {
    setController({})
    start()
    updateEvents.startProgress()
    pwaTest.options!.onNeedRefresh!()
    vi.advanceTimersByTime(1000)
    expect(useUpdate.getState()).toMatchObject({ phase: 'ready', progress: 100 })
  })

  it('A-37: restart waits for the write that is on its way', async () => {
    vi.useRealTimers()
    setController({})
    start()
    allowWrites()
    let finish = () => {}
    vi.mocked(idb.set).mockImplementation(() => new Promise<void>((r) => (finish = r)))
    void idbStorage.setItem('k', 'v')
    useUpdate.getState().restart()
    await tick()
    expect(pwaTest.updateCalls).toEqual([])
    finish()
    await tick()
    expect(pwaTest.updateCalls).toEqual([true])
  })

  it('automatic update: switches when the app goes out of sight, checks when it comes back', async () => {
    vi.useRealTimers()
    setController({})
    const { registration } = start(true)
    updateEvents.setReady()
    const visibility = (v: string) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: v })
      document.dispatchEvent(new Event('visibilitychange'))
    }
    visibility('visible')
    expect(registration.update).toHaveBeenCalled()
    visibility('hidden')
    await tick()
    expect(pwaTest.updateCalls).toContain(true)
    visibility('visible')
  })
})
