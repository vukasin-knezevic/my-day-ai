import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Today from './Today'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  const d = emptyData()
  useStore.setState({ ...d, settings: { ...d.settings, onboarded: true }, hydrated: true })
})

test('brzi unos dodaje trening i može da se označi kao urađen', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.type(screen.getByLabelText('Brzi unos'), 'trening 18-19:30')
  await user.click(screen.getByRole('button', { name: 'Dodaj' }))
  expect(useStore.getState().activities).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: /Urađeno/ }))
  expect(useStore.getState().activities[0].status).toBe('done')
})

test('brzi unos troška', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.type(screen.getByLabelText('Brzi unos'), 'kafa 200')
  await user.click(screen.getByRole('button', { name: 'Dodaj' }))
  expect(useStore.getState().expenses[0]).toMatchObject({ amount: 200, category: 'hrana' })
})

test('neprijavljen kolokvijum se vidi kao upozorenje', () => {
  const today = new Date()
  const iso = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  useStore.getState().add('assessments', {
    subjectId: 'x',
    type: 'kolokvijum',
    title: 'Kol test',
    date: iso(5),
    registrationDeadline: iso(2),
    registration: 'nije-prijavljen',
    maxPoints: 30,
    points: null,
    difficulty: 3,
    studyHours: 4,
  })
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  expect(screen.getByText(/Neprijavljen: Kol test/)).toBeInTheDocument()
})
