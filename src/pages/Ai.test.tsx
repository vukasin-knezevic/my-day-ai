import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Ai from './Ai'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { todayStr } from '../lib/dates'

beforeEach(() => {
  const d = emptyData()
  useStore.setState({ ...d, settings: { ...d.settings, onboarded: true }, hydrated: true })
})

const plan = (date: string) =>
  'Evo plana, srećno! 💪\n```json\n' +
  JSON.stringify({
    summary: 'Fokus',
    activities: [{ title: 'Učenje', category: 'study', date, start: '10:00', end: '12:00' }],
  }) +
  '\n```\nJavi kako ide.'

test('ručni režim: nalepi odgovor, proveri, prihvati kao predlog', async () => {
  const user = userEvent.setup()
  render(<Ai />)
  fireEvent.change(screen.getByLabelText('Nalepi odgovor'), { target: { value: plan(todayStr()) } })
  await user.click(screen.getByRole('button', { name: 'Proveri odgovor' }))
  expect(screen.getByText('Fokus')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Prihvati' }))
  const a = useStore.getState().activities[0]
  expect(a).toMatchObject({ source: 'ai', suggested: true, title: 'Učenje' })
})

test('neispravan odgovor daje jasnu poruku', async () => {
  const user = userEvent.setup()
  render(<Ai />)
  fireEvent.change(screen.getByLabelText('Nalepi odgovor'), {
    target: { value: '```json\n{ nije json }\n```' },
  })
  await user.click(screen.getByRole('button', { name: 'Proveri odgovor' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Napiši Claude-u')
})

test('bez ključa nema API dugmeta', () => {
  render(<Ai />)
  expect(screen.queryByRole('button', { name: /Pošalji Claude-u/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Kopiraj za Claude/ })).toBeInTheDocument()
})
