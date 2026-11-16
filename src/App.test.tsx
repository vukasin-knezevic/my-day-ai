import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useStore } from './store'
import { emptyData } from './lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

test('prvo otvaranje prikazuje onboarding, pa glavnu aplikaciju', async () => {
  const user = userEvent.setup()
  render(<App />)
  expect(await screen.findByRole('heading', { name: /Dobrodošao/ })).toBeInTheDocument()
  for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Dalje' }))
  await user.click(screen.getByRole('button', { name: 'Završi' }))
  expect(useStore.getState().settings.onboarded).toBe(true)
  expect(useStore.getState().hasDemo()).toBe(true)
  expect(screen.getAllByText(/Danas/).length).toBeGreaterThan(0)
})

test('0.6: ruta /ai vodi na početnu dok su AI alati isključeni', async () => {
  const d = emptyData()
  useStore.setState({
    ...d,
    settings: { ...d.settings, onboarded: true, tutorialDone: true },
    hydrated: true,
  })
  window.location.hash = '#/ai'
  render(<App />)
  expect((await screen.findAllByText(/Danas/)).length).toBeGreaterThan(0)
  await vi.waitFor(() => expect(window.location.hash).toBe('#/'))
  window.location.hash = ''
})

test('verzija iz package.json je 0.x do zvanične objave', () => {
  expect(__APP_VERSION__).toMatch(/^0\.\d+\.\d+$/)
  expect(__APP_VERSION__).toBe('0.6.0')
})
