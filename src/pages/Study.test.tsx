import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Study from './Study'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

const addSubject = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Naziv predmeta'), 'Fizika')
  await user.click(screen.getByRole('button', { name: 'Dodaj predmet' }))
}

test('predmet se briše tek na drugi klik', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  await user.click(screen.getByRole('button', { name: 'Obriši predmet Fizika' }))
  expect(useStore.getState().subjects).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: /Sigurno\?/ }))
  expect(useStore.getState().subjects).toHaveLength(0)
})

test('klik negde drugde otkazuje brisanje predmeta', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  await user.click(screen.getByRole('button', { name: 'Obriši predmet Fizika' }))
  await user.click(screen.getByLabelText('Naziv predmeta'))
  await user.click(screen.getByRole('button', { name: 'Obriši predmet Fizika' }))
  expect(useStore.getState().subjects).toHaveLength(1)
})

test('termin ne može da se završi pre početka', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await addSubject(user)
  fireEvent.change(screen.getByLabelText('Kraj'), { target: { value: '09:00' } })
  await user.click(screen.getByRole('button', { name: '+ Termin' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Kraj mora biti posle početka')
  expect(useStore.getState().subjects[0].slots).toHaveLength(0)
})

test('predmet + termin + pitanje idem / ne idem', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await user.type(screen.getByLabelText('Naziv predmeta'), 'Fizika')
  await user.click(screen.getByRole('button', { name: 'Dodaj predmet' }))
  await user.click(screen.getByRole('button', { name: '+ Termin' }))
  expect(screen.getByText('Da li ideš na ove termine?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /^Ne idem: Fizika/ }))
  expect(useStore.getState().subjects[0].slots[0].attendance).toBe('ne-idem')
  expect(screen.getByText('slobodno vreme')).toBeInTheDocument()
})
