import { del, get, set } from 'idb-keyval'
import { allowWrites, flushStorage, idbStorage, requestPersistentStorage } from './storage'

vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))

const broken = () => Promise.reject(new Error('IndexedDB is not available'))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(set).mockResolvedValue(undefined)
  allowWrites()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('idbStorage', () => {
  it('reads and writes through IndexedDB', async () => {
    vi.mocked(get).mockResolvedValue('saved')
    expect(await idbStorage.getItem('k')).toBe('saved')
    await idbStorage.setItem('k', 'v')
    expect(set).toHaveBeenCalledWith('k', 'v')
    await idbStorage.removeItem('k')
    expect(del).toHaveBeenCalledWith('k')
  })
  it('nothing saved yet reads as null', async () => {
    vi.mocked(get).mockResolvedValue(undefined)
    expect(await idbStorage.getItem('k')).toBeNull()
  })
  it('a failing write or delete does not take the app down', async () => {
    vi.mocked(set).mockImplementation(broken)
    vi.mocked(del).mockImplementation(broken)
    await expect(idbStorage.setItem('k', 'v')).resolves.toBeUndefined()
    await expect(idbStorage.removeItem('k')).resolves.toBeUndefined()
    expect(console.warn).toHaveBeenCalledTimes(2)
  })
  it('a failing READ is reported, so "could not read" is never taken for "nothing saved" (A-02)', async () => {
    vi.mocked(get).mockImplementation(broken)
    await expect(idbStorage.getItem('k')).rejects.toThrow('IndexedDB is not available')
  })
  it('nothing is written until the saved data was read (A-02)', async () => {
    allowWrites(false)
    await idbStorage.setItem('k', 'v')
    expect(set).not.toHaveBeenCalled()
  })
  it('flushStorage waits for the write that is on its way (A-37)', async () => {
    let finish = () => {}
    vi.mocked(set).mockImplementation(() => new Promise<void>((r) => (finish = r)))
    void idbStorage.setItem('k', 'v')
    let flushed = false
    void flushStorage().then(() => (flushed = true))
    await new Promise((r) => setTimeout(r, 5))
    expect(flushed).toBe(false)
    finish()
    await flushStorage()
    expect(flushed).toBe(true)
  })
})

describe('requestPersistentStorage (A-03)', () => {
  const stub = (storage: unknown) =>
    Object.defineProperty(navigator, 'storage', { configurable: true, value: storage })
  it('asks once; a storage that is already persistent is not asked again', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    stub({ persist, persisted: () => Promise.resolve(false) })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).toHaveBeenCalledOnce()
    stub({ persist, persisted: () => Promise.resolve(true) })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).toHaveBeenCalledOnce()
  })
  it('browsers without it, or an error, answer "no" without throwing', async () => {
    stub(undefined)
    expect(await requestPersistentStorage()).toBe(false)
    stub({ persist: () => Promise.reject(new Error('x')) })
    expect(await requestPersistentStorage()).toBe(false)
  })
})
