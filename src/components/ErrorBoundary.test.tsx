import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from './ErrorBoundary'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import * as files from '../lib/files'

function Broken(): never {
  throw new Error('boom')
}

const crash = () =>
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  )

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

test('a crashed screen shows a way out instead of a blank page', () => {
  crash()
  expect(screen.getByRole('heading', { name: 'Nešto je pošlo naopako' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Učitaj ponovo' })).toBeInTheDocument()
})

test('without a crash it shows its children', () => {
  render(
    <ErrorBoundary>
      <p>radi</p>
    </ErrorBoundary>,
  )
  expect(screen.getByText('radi')).toBeInTheDocument()
})

test('A-15: „Obriši podatke i kreni ispočetka“ radi tek kad je kopija preuzeta', async () => {
  const user = userEvent.setup()
  const reload = vi.fn()
  vi.stubGlobal('location', { ...window.location, reload })
  useStore.setState({ ...emptyData(), hydrated: true })
  useStore.getState().setSettings({ name: 'Mila', onboarded: true })
  const share = vi.spyOn(files, 'shareOrDownload').mockResolvedValue('cancelled')
  crash()

  const wipe = screen.getByRole('button', { name: 'Obriši podatke i kreni ispočetka' })
  expect(wipe).toBeDisabled()
  expect(screen.getByText(/prvo preuzmi kopiju/)).toBeInTheDocument()

  // closing the share sheet is not a saved copy
  await user.click(screen.getByRole('button', { name: 'Preuzmi fajl' }))
  expect(wipe).toBeDisabled()

  share.mockResolvedValue('downloaded')
  await user.click(screen.getByRole('button', { name: 'Preuzmi fajl' }))
  expect(share.mock.calls[1][1]).toContain('"name": "Mila"')
  await waitFor(() => expect(wipe).toBeEnabled())
  expect(screen.getByText(/Kopija je sačuvana/)).toBeInTheDocument()

  await user.click(wipe)
  await waitFor(() => expect(reload).toHaveBeenCalledOnce())
  expect(useStore.getState().settings).toMatchObject({ name: '', onboarded: false })
  vi.unstubAllGlobals()
})
