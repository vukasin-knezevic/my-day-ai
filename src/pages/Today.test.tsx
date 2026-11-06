import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

test('nova aktivnost iz forme, ponavljanje radnim danima, Enter čuva', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: '+ Nova aktivnost' }))
  await user.type(screen.getByLabelText('Naziv'), 'Teretana')
  await user.selectOptions(screen.getByLabelText('Ponavljanje'), 'weekdays')
  await user.click(screen.getByLabelText('Naziv'))
  await user.keyboard('{Enter}')
  const a = useStore.getState().activities
  expect(a).toHaveLength(1)
  expect(a[0]).toMatchObject({ title: 'Teretana', recurrence: 'weekdays' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('izmena postojeće aktivnosti', async () => {
  const user = userEvent.setup()
  const t = new Date()
  const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  useStore.getState().add('activities', {
    title: 'Staro ime',
    category: 'study',
    date: iso,
    start: '10:00',
    end: '11:00',
    recurrence: 'none',
    status: 'planned',
    source: 'me',
  })
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: 'Izmeni Staro ime' }))
  const title = screen.getByLabelText('Naziv')
  await user.clear(title)
  await user.type(title, 'Novo ime')
  await user.click(screen.getByRole('button', { name: 'Sačuvaj izmene' }))
  expect(useStore.getState().activities).toHaveLength(1)
  expect(useStore.getState().activities[0].title).toBe('Novo ime')
})

test('Escape zatvara formu bez čuvanja', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: '+ Nova aktivnost' }))
  await user.type(screen.getByLabelText('Naziv'), 'X')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(useStore.getState().activities).toHaveLength(0)
})

test('kraj pre početka daje grešku', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: '+ Nova aktivnost' }))
  await user.type(screen.getByLabelText('Naziv'), 'X')
  fireEvent.change(screen.getByLabelText('Kraj'), { target: { value: '17:00' } })
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Dodaj' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Kraj mora biti posle početka')
  expect(useStore.getState().activities).toHaveLength(0)
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
