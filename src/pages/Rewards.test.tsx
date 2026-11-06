import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Today from './Today'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { todayStr } from '../lib/dates'

beforeEach(() => {
  const d = emptyData()
  useStore.setState({ ...d, settings: { ...d.settings, onboarded: true }, hydrated: true })
})

test('urađeno daje XP i PS5 vreme, samo jednom', async () => {
  const user = userEvent.setup()
  useStore.getState().add('activities', {
    title: 'Učenje',
    category: 'study',
    date: todayStr(),
    start: '10:00',
    end: '12:00',
    recurrence: 'none',
    status: 'planned',
    source: 'me',
  })
  render(<Today />)
  await user.click(screen.getByRole('button', { name: /Urađeno/ }))
  const p = useStore.getState().progress
  expect(p.xp).toBe(40)
  expect(p.ps5EarnedMin).toBe(60)
  // the same event can never pay twice
  useStore.getState().award({ id: p.awarded[0], date: 'd', reason: 'x', xp: 40, category: 'study' })
  expect(useStore.getState().progress.xp).toBe(40)
})

test('igranje troši PS5 vreme bez prekora', async () => {
  const user = userEvent.setup()
  render(<Today />)
  await user.click(screen.getByRole('button', { name: 'Igrao 30 min' }))
  expect(useStore.getState().progress.ps5SpentMin).toBe(30)
  expect(useStore.getState().games).toHaveLength(1)
})
