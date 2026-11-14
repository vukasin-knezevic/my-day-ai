import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WatchCard from './WatchCard'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { createMockSource } from '../lib/health/mock'
import { setHealthSource } from '../lib/health'

beforeEach(() => useStore.setState({ ...emptyData(), hydrated: true }))
afterEach(() => setHealthSource(null))

test('not available: says so and offers Health Connect settings', async () => {
  setHealthSource(createMockSource({ availability: 'unavailable' }))
  render(<WatchCard />)
  expect(await screen.findByText(/Health Connect nije dostupan/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Otvori Health Connect/ })).toBeInTheDocument()
})

test('connect asks for permission, syncs and shows the connected state', async () => {
  const user = userEvent.setup()
  setHealthSource(
    createMockSource({ steps: { [new Date().toISOString().slice(0, 10)]: { a: 100 } } }),
  )
  render(<WatchCard />)
  await user.click(await screen.findByRole('button', { name: 'Poveži sat' }))
  await waitFor(() => expect(useStore.getState().settings.watchConnected).toBe(true))
  expect(await screen.findByText(/Povezano/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sinhronizuj sada' })).toBeInTheDocument()
})

test('revoked permission shows the next action', async () => {
  useStore.setState({ settings: { ...emptyData().settings, watchConnected: true } })
  setHealthSource(createMockSource({ permissions: { steps: false, sleep: true } }))
  render(<WatchCard />)
  expect(await screen.findAllByText(/Dozvola je uklonjena/)).not.toHaveLength(0)
  expect(screen.getByRole('button', { name: 'Poveži sat' })).toBeInTheDocument()
})

test('disconnect clears the connection but keeps the data', async () => {
  const user = userEvent.setup()
  useStore.setState({ settings: { ...emptyData().settings, watchConnected: true } })
  setHealthSource(createMockSource())
  render(<WatchCard />)
  await user.click(await screen.findByRole('button', { name: 'Prekini vezu' }))
  expect(useStore.getState().settings.watchConnected).toBe(false)
})
