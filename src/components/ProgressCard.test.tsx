import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProgressCard from './ProgressCard'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => useStore.setState({ ...emptyData(), hydrated: true }))

test('klik na XP otvara istoriju: šta, koliko, datum i sat (stari događaji samo datum)', async () => {
  const user = userEvent.setup()
  const at = new Date(2026, 10, 7, 18, 45).toISOString()
  useStore.setState({
    progress: {
      ...useStore.getState().progress,
      xp: 35,
      events: [
        { id: 'a', date: '2026-11-06', reason: 'Trening', xp: 30, category: 'workout' },
        { id: 'b', date: '2026-11-07', reason: 'Voda', xp: 5, category: 'habits', at },
      ],
    },
  })
  render(<ProgressCard />)
  await user.click(screen.getByRole('button', { name: '35 XP' }))
  const list = within(screen.getByRole('dialog')).getByRole('list')
  const items = within(list).getAllByRole('listitem')
  // the newest first
  expect(items[0]).toHaveTextContent('Voda')
  expect(items[0]).toHaveTextContent('07.11.2026 18:45')
  expect(items[0]).toHaveTextContent('+5 XP')
  expect(items[1]).toHaveTextContent('Trening')
  expect(items[1]).toHaveTextContent('06.11.2026')
  expect(items[1]).not.toHaveTextContent(':')
})

test('nova zasluga dobija vreme', () => {
  useStore
    .getState()
    .award({ id: 'x', date: '2026-11-07', reason: 'Test', xp: 10, category: 'study' })
  expect(useStore.getState().progress.events[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
})
