import { MemoryRouter } from 'react-router-dom'
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

test('ceo ponavljajući niz se briše tek na drugi klik, jednokratna aktivnost odmah', async () => {
  const user = userEvent.setup()
  const activity = (title: string, recurrence: 'none' | 'daily') =>
    useStore.getState().add('activities', {
      title,
      category: 'habits',
      date: todayStr(),
      start: '10:00',
      end: '11:00',
      recurrence,
      status: 'planned',
      source: 'me',
    })
  activity('Šetnja', 'daily')
  activity('Kafa', 'none')
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: 'Obriši Kafa' }))
  expect(useStore.getState().activities.map((a) => a.title)).toEqual(['Šetnja'])
  await user.click(screen.getByRole('button', { name: 'Obriši Šetnja' }))
  expect(useStore.getState().activities).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: /Sigurno\?/ }))
  expect(useStore.getState().activities).toHaveLength(0)
})

test('urađeno daje XP i vreme nagrade, samo jednom', async () => {
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
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: /Urađeno/ }))
  const p = useStore.getState().progress
  expect(p.xp).toBe(40)
  expect(p.rewardEarnedMin).toBe(60)
  // the same event can never pay twice
  useStore.getState().award({ id: p.awarded[0], date: 'd', reason: 'x', xp: 40, category: 'study' })
  expect(useStore.getState().progress.xp).toBe(40)
})

test('iskorišćena nagrada se beleži bez prekora', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: 'Iskoristio 30 min' }))
  expect(useStore.getState().progress.rewardSpentMin).toBe(30)
  expect(useStore.getState().games).toHaveLength(1)
})
