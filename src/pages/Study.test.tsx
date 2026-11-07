import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Study from './Study'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
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

test('termin se briše sa ✕, može da se poništi i ne dodaje se dvaput', async () => {
  const user = userEvent.setup()
  render(<Study />)
  await user.type(screen.getByLabelText('Naziv predmeta'), 'Fizika')
  await user.click(screen.getByRole('button', { name: 'Dodaj predmet' }))
  await user.dblClick(screen.getByRole('button', { name: '+ Termin' }))
  expect(useStore.getState().subjects[0].slots).toHaveLength(1)
  expect(screen.getByRole('alert')).toHaveTextContent('već postoji')
  await user.click(screen.getByRole('button', { name: /^Obriši termin/ }))
  expect(useStore.getState().subjects[0].slots).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Poništi' }))
  expect(useStore.getState().subjects[0].slots).toHaveLength(1)
})
