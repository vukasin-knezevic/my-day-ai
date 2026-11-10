import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Life from './Life'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { useUndo } from '../lib/undo'

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

test('navika vraćena ispod cilja oduzima XP', async () => {
  const user = userEvent.setup()
  render(<Life />)
  await user.click(screen.getByRole('tab', { name: /Navike/ }))
  await user.type(screen.getByLabelText('Naziv'), 'Čitanje')
  await user.click(screen.getByRole('button', { name: 'Dodaj naviku' }))
  await user.click(screen.getByLabelText('Danas urađeno'))
  expect(useStore.getState().progress.xp).toBe(5)
  await user.click(screen.getByLabelText('Danas urađeno'))
  expect(useStore.getState().progress.xp).toBe(0)
  await user.click(screen.getByLabelText('Danas urađeno'))
  expect(useStore.getState().progress.xp).toBe(5)
})

const isoAgo = (hours: number) => {
  const d = new Date(Date.now() - hours * 3600000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}
const night = (id: string, bedHoursAgo: number, wakeHoursAgo: number | null) => ({
  id,
  date: isoAgo(wakeHoursAgo ?? bedHoursAgo).slice(0, 10),
  bedtime: isoAgo(bedHoursAgo),
  wakeTime: wakeHoursAgo === null ? null : isoAgo(wakeHoursAgo),
  quality: null,
  source: 'manual' as const,
})

test('A-12: zaboravljeno „Ustao“ od pre tri dana ne blokira novo „Legao“', () => {
  useStore.setState({ sleep: [night('stari', 72, null)] })
  render(<Life />)
  expect(screen.getByRole('button', { name: /Legao/ })).toBeEnabled()
  expect(screen.getByText(/buđenje nije upisano/)).toBeInTheDocument()
})

test('A-12: unos sna može da se obriše (i vrati) i da se izmeni', async () => {
  const user = userEvent.setup()
  useStore.setState({ sleep: [night('a', 10, 2), night('b', 5, null)] })
  render(<Life />)
  const del = screen.getAllByRole('button', { name: /Obriši san/ })
  expect(del).toHaveLength(2)
  await user.click(del[1])
  expect(useStore.getState().sleep.map((s) => s.id)).toEqual(['b'])
  useUndo.getState().undo()
  expect(useStore.getState().sleep.map((s) => s.id)).toEqual(['a', 'b'])

  // the open night: the editor offers "now" as the wake-up
  await user.click(screen.getAllByRole('button', { name: /Izmeni san/ })[0])
  await user.click(await screen.findByRole('button', { name: 'Sačuvaj' }))
  const b = useStore.getState().sleep.find((s) => s.id === 'b')!
  expect(b.wakeTime).not.toBeNull()
})
