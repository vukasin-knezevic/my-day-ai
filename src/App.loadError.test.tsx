import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as idb from 'idb-keyval'
import App from './App'
import { useStore } from './store'

vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.reject(new Error('The database connection is closing'))),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
}))

test('A-02: baza baca grešku → „Podaci nisu mogli da se učitaju“, ništa se ne upisuje, „Pokušaj ponovo“ učita', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const user = userEvent.setup()
  render(<App />)
  expect(
    await screen.findByRole('heading', { name: 'Podaci nisu mogli da se učitaju' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: /Dobrodoš/ })).not.toBeInTheDocument()
  // a change in this state must not reach the database
  useStore.getState().setSettings({ name: 'X' })
  expect(idb.set).not.toHaveBeenCalled()

  const saved = { state: { settings: { name: 'Mila', onboarded: false } }, version: 1 }
  vi.mocked(idb.get).mockResolvedValue(JSON.stringify(saved))
  await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }))
  await waitFor(() => expect(useStore.getState().hydrated).toBe(true))
  expect(useStore.getState().settings.name).toBe('Mila')
  expect(useStore.getState().hydrationError).toBe(false)
  // from now on changes are saved again
  useStore.getState().setSettings({ name: 'Mila 2' })
  await waitFor(() => expect(idb.set).toHaveBeenCalled())
})
