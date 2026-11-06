import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Life from './Life'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

test('legao pa ustao zatvara san', async () => {
  const user = userEvent.setup()
  render(<Life />)
  await user.click(screen.getByRole('button', { name: /Legao/ }))
  expect(useStore.getState().sleep[0].wakeTime).toBeNull()
  await user.click(screen.getByRole('button', { name: /Ustao/ }))
  expect(useStore.getState().sleep).toHaveLength(1)
  expect(useStore.getState().sleep[0].wakeTime).not.toBeNull()
})

test('trošak iznad budžeta daje upozorenje', async () => {
  const user = userEvent.setup()
  useStore.getState().patch({ budget: { hrana: 100 } })
  render(<Life />)
  await user.click(screen.getByRole('tab', { name: /Novac/ }))
  await user.type(screen.getByLabelText('Iznos (RSD)'), '150')
  await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
  expect(screen.getByRole('alert')).toHaveTextContent('150%')
})

test('navika se štiklira i pravi niz', async () => {
  const user = userEvent.setup()
  render(<Life />)
  await user.click(screen.getByRole('tab', { name: /Navike/ }))
  await user.type(screen.getByLabelText('Naziv'), 'Čitanje')
  await user.click(screen.getByRole('button', { name: 'Dodaj naviku' }))
  await user.click(screen.getByLabelText('Danas urađeno'))
  expect(screen.getByText(/🔥 1 d/)).toBeInTheDocument()
})
