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

describe('registration deadline in the calendar (A-04)', () => {
  const exam = {
    id: 'e1',
    subjectId: 's',
    type: 'ispit' as const,
    title: 'Ispit',
    date: '2026-11-20',
    registration: 'nije-prijavljen' as const,
    maxPoints: 100,
    points: null,
    difficulty: 3 as const,
  }
  const now = new Date('2026-11-07T10:00:00')
  it('an entered deadline is an event on that day', () => {
    const d = { ...emptyData(), assessments: [{ ...exam, registrationDeadline: '2026-11-10' }] }
    const text = buildIcs(d, now)
    expect(text).toContain('Rok za prijavu: Ispit')
    expect(text).toContain('DTSTART;VALUE=DATE:20261110')
  })
  it('without a deadline: "check the deadline" 7 days before the exam', () => {
    const text = buildIcs({ ...emptyData(), assessments: [exam] }, now)
    expect(text).toContain('Proveri rok za prijavu: Ispit')
    expect(text).toContain('DTSTART;VALUE=DATE:20261113')
  })
  it('a registered exam has no deadline event', () => {
    const d = { ...emptyData(), assessments: [{ ...exam, registration: 'prijavljen' as const }] }
    expect(buildIcs(d, now)).not.toContain('rok za prijavu')
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
