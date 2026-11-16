import { MemoryRouter } from 'react-router-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Today from './Today'
import { useStore } from '../store'
import { useUndo } from '../lib/undo'
import { emptyData } from '../lib/defaults'
import { addDaysStr, todayStr } from '../lib/dates'

const touch = (x: number, y = 100) => ({
  touches: [{ clientX: x, clientY: y }],
  changedTouches: [{ clientX: x, clientY: y }],
})
const swipe = (el: Element, from: number, to: number, dy = 0) => {
  fireEvent.touchStart(el, touch(from))
  fireEvent.touchMove(el, touch((from + to) / 2, 100 + dy / 2))
  fireEvent.touchEnd(el, touch(to, 100 + dy))
}

const day = todayStr()
function seed(acts: { title: string; start: string; end: string; date?: string }[]) {
  const d = emptyData()
  useStore.setState({
    ...d,
    settings: { ...d.settings, onboarded: true, wakeTime: '00:00', bedTime: '23:59' },
    activities: acts.map((a, i) => ({
      id: `t${i}`,
      title: a.title,
      category: 'study' as const,
      date: a.date ?? day,
      start: a.start,
      end: a.end,
      recurrence: 'none' as const,
      status: 'planned' as const,
      source: 'me' as const,
    })),
    hydrated: true,
  })
  useUndo.getState().dismiss()
}
const show = () =>
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
const row = (title: string) =>
  screen.getAllByTestId('swipe-row').find((r) => r.textContent?.includes(title))!
const touchTarget = (title: string) => row(title).children[1] as HTMLElement

beforeEach(() => {
  vi.stubGlobal('matchMedia', undefined)
})

test('swipe right on a row marks it done; the normal button still works', async () => {
  seed([{ title: 'Fizika', start: '23:00', end: '23:30' }])
  show()
  swipe(touchTarget('Fizika'), 100, 260)
  expect(useStore.getState().activities[0].status).toBe('done')
  // the button path is unchanged
  seed([{ title: 'Hemija', start: '23:00', end: '23:30' }])
  show()
  await userEvent
    .setup()
    .click(within(row('Hemija') as HTMLElement).getByRole('button', { name: /Urađeno/ }))
  expect(useStore.getState().activities[0].status).toBe('done')
})

test('a short or a mostly vertical swipe does nothing', () => {
  seed([{ title: 'Fizika', start: '23:00', end: '23:30' }])
  show()
  swipe(touchTarget('Fizika'), 100, 150)
  swipe(touchTarget('Fizika'), 100, 260, 200)
  expect(useStore.getState().activities[0].status).toBe('planned')
})

test('swipe left moves it to the next free slot, shows the undo bar, and undo puts it back', () => {
  seed([
    { title: 'Fizika', start: '23:00', end: '23:30' },
    { title: 'Zauzeto', start: '00:00', end: '23:00' },
  ])
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(`${day}T10:00:00`) })
  show()
  swipe(touchTarget('Fizika'), 260, 100)
  const moved = useStore.getState().activities.find((a) => a.id === 't0')!
  // today has no gap after 23:00 before 23:59 for a half hour except 23:15-23:45 is taken by nothing: it moves later today or tomorrow
  // its own place is free once it leaves, but never earlier: the next 15-minute mark that fits is 23:15
  expect(moved).toMatchObject({ date: day, start: '23:15', end: '23:45' })
  expect(useUndo.getState().pending?.label).toMatch(/Pomereno: danas 23:15/)
  act(() => useUndo.getState().undo())
  const back = useStore.getState().activities.find((a) => a.id === 't0')!
  expect(back).toMatchObject({ date: day, start: '23:00', end: '23:30' })
  vi.useRealTimers()
})

test('swipe left with a full day today and tomorrow says so and changes nothing', () => {
  seed([
    { title: 'Fizika', start: '23:00', end: '23:30' },
    { title: 'A', start: '00:00', end: '23:59' },
    { title: 'B', date: addDaysStr(day, 1), start: '00:00', end: '23:59' },
  ])
  show()
  swipe(touchTarget('Fizika'), 260, 100)
  expect(useStore.getState().activities[0]).toMatchObject({ date: day, start: '23:00' })
  expect(screen.getByText(/Nema slobodnog termina/)).toBeInTheDocument()
})

test('a swipe that starts on a row does not change the day; on the empty area it does', () => {
  seed([{ title: 'Fizika', start: '23:00', end: '23:30' }])
  const { container } = show()
  const page = container.firstElementChild as HTMLElement
  // the page-level swipe is ignored when the gesture starts inside a row (data-no-swipe)
  fireEvent.touchStart(touchTarget('Fizika'), touch(260))
  fireEvent.touchEnd(touchTarget('Fizika'), touch(60))
  expect(screen.queryByRole('button', { name: 'Nazad na danas' })).toBeNull()
  // left on the empty area (the page itself): the next day
  swipe(page, 260, 60)
  expect(screen.getByRole('button', { name: /Danas|Nazad/ })).toBeInTheDocument()
  expect(screen.getByText('Sutra', { exact: false })).toBeInTheDocument()
})

test('there is a keyboard path for moving: the menu has the move button', async () => {
  seed([{ title: 'Fizika', start: '23:00', end: '23:30' }])
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(`${day}T10:00:00`) })
  show()
  vi.useRealTimers()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Više za Fizika|Fizika/, hidden: false }))
  expect(
    await screen.findByRole('button', { name: /Pomeri na sledeći slobodan termin/ }),
  ).toBeInTheDocument()
})
