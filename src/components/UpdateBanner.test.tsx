import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UpdateBanner from './UpdateBanner'
import { updateEvents, useUpdate } from '../lib/updates'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  vi.useRealTimers()
  useStore.setState({ ...emptyData(), hydrated: true })
  useUpdate.setState({ phase: 'idle', progress: 0, restart: () => {} })
})

test('nema poruke dok nema novog update-a', () => {
  render(<UpdateBanner />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('preuzimanje pokazuje traku 0–100%, na kraju dugme „Restartuj aplikaciju"', async () => {
  const user = userEvent.setup()
  const restart = vi.fn()
  useUpdate.setState({ restart })
  render(<UpdateBanner />)
  act(() => updateEvents.startProgress())
  expect(screen.getByText(/Novi update/)).toBeInTheDocument()
  const bar = screen.getByRole('progressbar')
  expect(Number(bar.getAttribute('aria-valuenow'))).toBeLessThan(100)
  expect(screen.queryByRole('button', { name: 'Restartuj aplikaciju' })).not.toBeInTheDocument()
  act(() => updateEvents.setReady())
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  await user.click(screen.getByRole('button', { name: 'Restartuj aplikaciju' }))
  expect(restart).toHaveBeenCalledOnce()
})

test('isključeno automatsko ažuriranje: ista poruka, korisnik bira kada', async () => {
  useStore.getState().setSettings({ autoUpdate: false })
  render(<UpdateBanner />)
  await act(async () => updateEvents.setReady())
  expect(screen.getByText(/Restartuj kad ti odgovara/)).toBeInTheDocument()
  await act(async () => useStore.getState().setSettings({ autoUpdate: true }))
  expect(screen.getByText(/Uključiće se sama/)).toBeInTheDocument()
})
