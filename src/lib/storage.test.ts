import { del, get, set } from 'idb-keyval'
import { idbStorage } from './storage'

vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))

const broken = () => Promise.reject(new Error('IndexedDB is not available'))

beforeEach(() => {
  vi.clearAllMocks()
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
  it('a failing database does not take the app down', async () => {
    vi.mocked(get).mockImplementation(broken)
    vi.mocked(set).mockImplementation(broken)
    vi.mocked(del).mockImplementation(broken)
    expect(await idbStorage.getItem('k')).toBeNull()
    await expect(idbStorage.setItem('k', 'v')).resolves.toBeUndefined()
    await expect(idbStorage.removeItem('k')).resolves.toBeUndefined()
    expect(console.warn).toHaveBeenCalledTimes(3)
  })
})
