import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Planner from './Planner'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import type { Activity, Assessment } from '../types'

const MONDAY_MORNING = new Date(2026, 10, 2, 8, 0)
const SUNDAY_MORNING = new Date(2026, 10, 1, 8, 0)

const midterm: Omit<Assessment, 'id'> = {
  subjectId: 's1',
  type: 'kolokvijum',
  title: 'Kol 1',
  date: '2026-11-06',
  registration: 'prijavljen',
  maxPoints: 30,
  points: null,
  difficulty: 4,
  studyHours: 8,
}
const workoutBeforeMidterm: Omit<Activity, 'id'> = {
  title: 'Teretana',
  category: 'workout',
  date: '2026-11-05',
  start: '18:00',
  end: '20:00',
  recurrence: 'none',
  status: 'planned',
  source: 'me',
}

const studyPlan = () =>
  useStore.getState().activities.filter((a) => a.category === 'study' && a.suggested)
const propose = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Predloži plan' }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(MONDAY_MORNING)
  const d = emptyData()
  useStore.setState({
    ...d,
    settings: { ...d.settings, workoutsPerWeek: 0 },
    subjects: [{ id: 's1', name: 'Mata', color: '#000', espb: 6, passMark: 51, slots: [] }],
    hydrated: true,
  })
  useStore.getState().add('assessments', midterm)
})
afterEach(() => {
  vi.useRealTimers()
})

test('predlog učenja se pravi, a posle prihvatanja više nije predlog', async () => {
  const user = userEvent.setup()
  render(<Planner />)
  expect(screen.getByText(/Nema predloga/)).toBeInTheDocument()
  await propose(user)
  expect(studyPlan().length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Učenje: Mata/).length).toBeGreaterThan(0)
  await user.click(screen.getByRole('button', { name: 'Prihvati sve' }))
  expect(studyPlan()).toHaveLength(0)
  expect(useStore.getState().activities.length).toBeGreaterThan(0)
})

test('ponovno pravljenje plana menja stari predlog umesto da ga duplira', async () => {
  const user = userEvent.setup()
  render(<Planner />)
  await propose(user)
  const first = studyPlan().length
  await propose(user)
  expect(studyPlan()).toHaveLength(first)
})

test('plan posle prihvatanja ne dodaje još učenja za isti kolokvijum', async () => {
  const user = userEvent.setup()
  render(<Planner />)
  await propose(user)
  await user.click(screen.getByRole('button', { name: 'Prihvati sve' }))
  await propose(user)
  expect(studyPlan()).toHaveLength(0)
})

test('jedan predlog može da se odbaci', async () => {
  const user = userEvent.setup()
  render(<Planner />)
  await propose(user)
  const before = studyPlan().length
  await user.click(screen.getAllByRole('button', { name: /^Odbaci Učenje/ })[0])
  expect(studyPlan()).toHaveLength(before - 1)
})

test('veče pred kolokvijum: nudi skraćenje treninga i primenjuje ga', async () => {
  const user = userEvent.setup()
  const id = useStore.getState().add('activities', workoutBeforeMidterm)
  render(<Planner />)
  await propose(user)
  await user.click(screen.getByRole('button', { name: 'Skrati trening do 18:45' }))
  expect(useStore.getState().activities.find((a) => a.id === id)?.end).toBe('18:45')
  expect(screen.queryByRole('button', { name: /Skrati trening/ })).not.toBeInTheDocument()
})

test('u nedelju se planira cela sledeća nedelja', async () => {
  vi.setSystemTime(SUNDAY_MORNING)
  const user = userEvent.setup()
  render(<Planner />)
  await propose(user)
  const days = studyPlan().map((a) => a.date)
  expect(days.length).toBeGreaterThan(0)
  expect(days.every((d) => d >= '2026-11-02')).toBe(true)
})
