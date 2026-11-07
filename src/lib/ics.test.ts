import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildIcs, buildIcsWithProgress, shareCalendar } from './ics'
import { emptyData } from './defaults'
import { makeDemoData } from './demo'

afterEach(() => vi.unstubAllGlobals())

const data = () =>
  ({ ...emptyData(), ...makeDemoData('2026-11-07') }) as ReturnType<typeof emptyData>

describe('buildIcsWithProgress', () => {
  it('gives the same file as buildIcs and reports progress up to 100%', async () => {
    const now = new Date('2026-11-07T10:00:00')
    const seen: number[] = []
    const d = data()
    const text = await buildIcsWithProgress(d, (f) => seen.push(f), now)
    expect(text).toBe(buildIcs(d, now))
    expect(seen.at(-1)).toBe(1)
    expect([...seen].sort((a, b) => a - b)).toEqual(seen)
  })
})

describe('shareCalendar', () => {
  it('offers the file to the phone (Web Share) so the Calendar app can take it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: () => true })
    expect(await shareCalendar('BEGIN:VCALENDAR')).toBe('shared')
    const arg = share.mock.calls[0][0] as { files: File[] }
    expect(arg.files[0].type).toBe('text/calendar')
    expect(arg.files[0].name).toBe('my-day-ai.ics')
  })
  it('closing the share sheet is not an error and downloads nothing', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError'))
    vi.stubGlobal('navigator', { share, canShare: () => true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(await shareCalendar('x')).toBe('cancelled')
    expect(click).not.toHaveBeenCalled()
  })
  it('without Web Share for files it is a normal download', async () => {
    vi.stubGlobal('navigator', {})
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(await shareCalendar('x')).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
})
