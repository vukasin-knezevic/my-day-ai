import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Planner from './Planner'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { addDaysStr, todayStr, weekStartStr } from '../lib/dates'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

test('predlog plana se pravi i može da se prihvati', async () => {
  const user = userEvent.setup()
  render(<Planner />)
  await user.click(screen.getByRole('button', { name: 'Predloži plan' }))
  const suggested = useStore.getState().activities.filter((a) => a.suggested)
  // sa praznim podacima planer predlaže samo treninge (ili ništa ako je kraj nedelje)
  expect(suggested.every((a) => a.category === 'workout')).toBe(true)
  if (suggested.length) {
    await user.click(screen.getByRole('button', { name: 'Prihvati sve' }))
    expect(useStore.getState().activities.every((a) => !a.suggested)).toBe(true)
  }
})

test('planer uvek odgovori: kad nema šta da se doda, kaže da je sve isplanirano', async () => {
  const user = userEvent.setup()
  useStore.getState().setSettings({ workoutsPerWeek: 0 })
  render(<Planner />)
  await user.click(screen.getByRole('button', { name: 'Predloži plan' }))
  expect(screen.getByRole('status')).toHaveTextContent('Sve je već isplanirano ✅')
})

test('planer javlja odakle počinje učenje za obavezu, za izabranu nedelju', async () => {
  const user = userEvent.setup()
  const monday = weekStartStr(addDaysStr(todayStr(), 7))
  const s = useStore.getState()
  s.setSettings({ workoutsPerWeek: 0, studyHoursPerDay: 4 })
  const subjectId = s.add('subjects', {
    name: 'Matematika 1',
    color: '#2563eb',
    espb: 8,
    passMark: 51,
    slots: [],
  })
  s.add('assessments', {
    subjectId,
    type: 'kolokvijum',
    title: 'Kolokvijum 1 · Matematika 1',
    date: addDaysStr(monday, 4),
    registration: 'ne-treba',
    maxPoints: 30,
    points: null,
    difficulty: 3,
  })
  render(<Planner />)
  await user.click(screen.getByRole('button', { name: 'Sledeća nedelja' }))
  await user.click(screen.getByRole('button', { name: 'Predloži plan' }))
  expect(screen.getByRole('status')).toHaveTextContent(
    /Učenje za Matematika 1 počinje od .* \(kolokvijum /,
  )
  expect(useStore.getState().activities.some((a) => a.suggested && a.category === 'study')).toBe(
    true,
  )
})
