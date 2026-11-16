import { render, screen } from '@testing-library/react'
import TodayHero from './TodayHero'
import { emptyData } from '../lib/defaults'
import type { Occurrence } from '../lib/schedule'

const occ = (over: Partial<Occurrence> & { title: string }): Occurrence => ({
  key: over.title,
  category: 'study',
  date: '2026-11-16',
  start: '10:00',
  end: '11:00',
  status: 'planned',
  suggested: false,
  type: 'activity',
  activityId: over.title,
  ...over,
})
const data = emptyData()
const show = (p: Partial<React.ComponentProps<typeof TodayHero>>) =>
  render(
    <TodayHero
      current={null}
      next={null}
      minutesToNext={null}
      nowMin={600}
      today="2026-11-16"
      occ={[]}
      data={data}
      onAdd={() => undefined}
      {...p}
    />,
  )

test('the current thing shows the time that is left', () => {
  const cur = occ({ title: 'Fizika', start: '10:00', end: '11:30' })
  show({ current: cur, nowMin: 10 * 60 + 20, occ: [cur] })
  expect(screen.getByTestId('focus-countdown')).toHaveTextContent('Još 1 h 10 min')
})

test('when nothing is on, the next thing has a countdown to its start', () => {
  const nxt = occ({ title: 'Hemija', start: '12:00', end: '13:00' })
  show({ next: nxt, minutesToNext: 95, nowMin: 10 * 60 + 25, occ: [nxt] })
  expect(screen.getByTestId('focus-countdown')).toHaveTextContent('Počinje za 1 h 35 min')
})

test('a thing that runs past midnight counts down correctly', () => {
  const cur = occ({ title: 'Noć', start: '23:00', end: '01:00' })
  show({ current: cur, nowMin: 23 * 60 + 30, occ: [cur] })
  expect(screen.getByTestId('focus-countdown')).toHaveTextContent('Još 1 h 30 min')
})

test('an empty day: a calm message and one button to add something', () => {
  const onAdd = vi.fn()
  show({ onAdd })
  expect(screen.getByText(/Dan je tvoj/)).toBeInTheDocument()
  screen.getByRole('button', { name: 'Dodaj nešto' }).click()
  expect(onAdd).toHaveBeenCalledOnce()
})

test('the ring counts done of planned: skipped, suggested and classes are not planned', () => {
  const list = [
    occ({ title: 'a', status: 'done' }),
    occ({ title: 'b' }),
    occ({ title: 'c', status: 'skipped' }),
    occ({ title: 'd', suggested: true }),
    occ({ title: 'e', type: 'class' }),
  ]
  show({ occ: list })
  expect(screen.getByRole('img', { name: 'Urađeno danas: 1 od 2' })).toBeInTheDocument()
  expect(screen.getByTestId('day-ring')).toHaveTextContent('1 od 2')
})

test('no planned things: the ring says so, never a scolding', () => {
  show({})
  expect(screen.getByTestId('day-ring')).toHaveTextContent('Ništa planirano')
})

test('the streak is gentle: a fresh start, no red, no loss message', () => {
  show({})
  const card = screen.getByTestId('streak-card')
  expect(card).toHaveTextContent('Novi niz počinje danas')
  expect(card.innerHTML).not.toMatch(/red-|izgubio|propao/i)
})
