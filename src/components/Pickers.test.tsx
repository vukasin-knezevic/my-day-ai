import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Input } from './ui'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { panelGone, setTime } from '../test/pick'

function Demo({ initial = '09:00' }: { initial?: string }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <Input aria-label="Početak" type="time" value={v} onChange={(e) => setV(e.target.value)} />
      <output>{v}</output>
    </>
  )
}

beforeEach(() => useStore.setState({ ...emptyData(), hydrated: true }))

test('birač vremena: točkići sati i minuti, 24h', async () => {
  const user = userEvent.setup()
  render(<Demo />)
  expect(screen.getByLabelText('Početak')).toHaveTextContent('09:00')
  await setTime(user, 'Početak', '13:05')
  expect(screen.getByRole('status')).toHaveTextContent('13:05')
  expect(screen.getByLabelText('Početak')).toHaveTextContent('13:05')
})

test('12h prikaz i izbor sa AM/PM', async () => {
  const user = userEvent.setup()
  useStore.getState().setSettings({ timeFormat: '12h' })
  render(<Demo initial="13:00" />)
  expect(screen.getByLabelText('Početak')).toHaveTextContent('1:00 PM')
  await user.click(screen.getByLabelText('Početak'))
  await user.click(screen.getByRole('option', { name: '8' }))
  await user.click(screen.getByRole('button', { name: 'Gotovo' }))
  await panelGone()
  expect(screen.getByRole('status')).toHaveTextContent('20:00')
  expect(screen.getByLabelText('Početak')).toHaveTextContent('8:00 PM')
})

test('datum se prikazuje kao DD.MM.GGGG', () => {
  render(<Input aria-label="Datum" type="date" value="2026-11-07" onChange={() => {}} />)
  expect(screen.getByText('07.11.2026')).toBeInTheDocument()
})
