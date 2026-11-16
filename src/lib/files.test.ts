import { Capacitor } from '@capacitor/core'
import {
  canDownloadFile,
  canShareFile,
  downloadText,
  readFileText,
  shareOrDownload,
  wasSaved,
} from './files'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('downloadText', () => {
  it('A-14: the address is released later, not at once (Safari would cancel the download)', () => {
    vi.useFakeTimers()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadText('a.json', '{}', 'application/json')
    expect(click).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})

describe('shareOrDownload', () => {
  it('shares the file where the device can', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: () => true })
    expect(canShareFile('a.json', 'application/json')).toBe(true)
    expect(await shareOrDownload('a.json', '{}', 'application/json')).toBe('shared')
    const arg = share.mock.calls[0][0] as { files: File[] }
    expect(arg.files[0].name).toBe('a.json')
    expect(arg.files[0].type).toBe('application/json')
  })
  it('a failed share (not a cancel) falls back to a download', async () => {
    const share = vi.fn().mockRejectedValue(new Error('no'))
    vi.stubGlobal('navigator', { share, canShare: () => true })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(await shareOrDownload('a.json', '{}', 'application/json')).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
  it('canShare that throws means "cannot share"', () => {
    vi.stubGlobal('navigator', {
      share: vi.fn(),
      canShare: () => {
        throw new Error('x')
      },
    })
    expect(canShareFile('a.json', 'application/json')).toBe(false)
  })
})

describe('readFileText', () => {
  it('reads a picked file', async () => {
    expect(await readFileText(new File(['{"a":1}'], 'a.json'))).toBe('{"a":1}')
  })
  it('falls back to FileReader where file.text() does not exist', async () => {
    const blob = new Blob(['zdravo'])
    Object.defineProperty(blob, 'text', { value: undefined })
    expect(await readFileText(blob)).toBe('zdravo')
  })
})

describe('the Android app: its web view drops downloads and has no share sheet', () => {
  beforeEach(() => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
  })

  it('a file is never reported as saved when nothing left the app', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('navigator', {})
    expect(canDownloadFile()).toBe(false)
    const result = await shareOrDownload('a.ics', 'x', 'text/calendar')
    expect(result).toBe('failed')
    expect(wasSaved(result)).toBe(false)
    expect(click).not.toHaveBeenCalled()
  })

  it('a backup goes to the clipboard instead, and only a copy that worked counts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const opts = { copyFallback: true }
    expect(await shareOrDownload('a.json', '{"a":1}', 'application/json', opts)).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('{"a":1}')
    expect(wasSaved('copied')).toBe(true)
    writeText.mockRejectedValue(new Error('no focus'))
    expect(await shareOrDownload('a.json', '{}', 'application/json', opts)).toBe('failed')
    vi.stubGlobal('navigator', {})
    expect(await shareOrDownload('a.json', '{}', 'application/json', opts)).toBe('failed')
  })
})
