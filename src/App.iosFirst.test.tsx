import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useStore } from './store'
import { emptyData } from './lib/defaults'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1'

afterEach(() => vi.restoreAllMocks())

test('A-03: iPhone u Safariju prvo vidi instalaciju i upozorenje da se podaci ne prenose, pa tek onda uvod', async () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE)
  useStore.setState({ ...emptyData(), hydrated: true })
  const user = userEvent.setup()
  render(<App />)
  expect(
    screen.getByRole('heading', { name: 'Prvo dodaj aplikaciju na početni ekran' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/se ne prenose u instaliranu aplikaciju/)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: /Dobrodoš/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Nastavi u Safariju' }))
  expect(await screen.findByRole('heading', { name: /Dobrodoš/ })).toBeInTheDocument()
})

test('A-03: posle uvoda aplikacija traži trajno skladište', async () => {
  const persist = vi.fn().mockResolvedValue(true)
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { persist, persisted: () => Promise.resolve(false) },
  })
  useStore.setState({ ...emptyData(), hydrated: true })
  render(<App />)
  expect(await screen.findByRole('heading', { name: /Dobrodoš/ })).toBeInTheDocument()
  expect(persist).not.toHaveBeenCalled()
  useStore.getState().setSettings({ onboarded: true })
  await vi.waitFor(() => expect(persist).toHaveBeenCalledOnce())
})
