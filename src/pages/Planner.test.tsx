import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Planner from './Planner'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

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
