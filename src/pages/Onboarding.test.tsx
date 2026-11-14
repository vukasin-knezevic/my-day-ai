import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Onboarding from './Onboarding'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import { getLanguage } from '../i18n'
import { pick } from '../test/pick'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

async function clickNext(user: ReturnType<typeof userEvent.setup>, n = 1) {
  for (let i = 0; i < n; i++) await user.click(screen.getByRole('button', { name: 'Dalje' }))
}

test('onboarding se prolazi samo tastaturom: Enter = Dalje / Završi, Esc = Nazad', async () => {
  const user = userEvent.setup()
  render(<Onboarding />)
  expect(screen.getByText(/Korak 1 od 7/)).toBeInTheDocument()
  await user.keyboard('{Enter}') // language -> name (focus starts in the first field)
  expect(screen.getByText(/Korak 2 od 7/)).toBeInTheDocument()
  await user.type(screen.getByLabelText('Kako da te zovem?'), 'Mila')
  await user.keyboard('{Enter}')
  expect(screen.getByText(/Korak 3 od 7/)).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getByText(/Korak 2 od 7/)).toBeInTheDocument()
  expect(screen.getByLabelText('Kako da te zovem?')).toHaveValue('Mila')
  // focus moves to the first field of every new step, so Enter keeps working without the mouse
  await user.keyboard('{Enter}{Enter}{Enter}{Enter}{Enter}')
  expect(screen.getByText(/Korak 7 od 7/)).toBeInTheDocument()
  await user.keyboard('{Enter}')
  expect(useStore.getState().settings.onboarded).toBe(true)
  expect(useStore.getState().settings.name).toBe('Mila')
})

test('brisanje broja u onboardingu ne ostavlja nulu ispred', async () => {
  const user = userEvent.setup()
  render(<Onboarding />)
  await clickNext(user, 2)
  const sleep = screen.getByLabelText('Cilj sna (sati)')
  await user.clear(sleep)
  expect(sleep).toHaveValue('')
  await user.type(sleep, '7')
  expect(sleep).toHaveValue('7')
})

test('izbor AI režima i imena nagrade u onboardingu', async () => {
  const user = userEvent.setup()
  render(<Onboarding />)
  await clickNext(user, 4)
  const reward = screen.getByLabelText('Naziv nagrade')
  expect(reward).toHaveValue('')
  expect(reward).toHaveAttribute('placeholder', 'Vreme za zabavu')
  await user.type(reward, 'PS5 vreme')
  await clickNext(user, 2)
  expect(screen.getByLabelText(/Ručni \(besplatno\)/)).toBeChecked()
  expect(screen.queryByLabelText(/možeš i kasnije/)).not.toBeInTheDocument()
  await user.click(screen.getByLabelText(/API \(plaća se po upotrebi\)/))
  expect(screen.getByLabelText(/možeš i kasnije/)).toBeInTheDocument()
  expect(screen.getByText(/Nikome ga ne/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Završi' }))
  const s = useStore.getState().settings
  expect(s).toMatchObject({ aiMode: 'api', rewardName: 'PS5 vreme', onboarded: true })
})

test('izbor jezika u prvom koraku odmah menja jezik i pamti se', async () => {
  const user = userEvent.setup()
  render(<Onboarding />)
  await pick(user, 'Jezik', 'en')
  expect(getLanguage()).toBe('en')
  expect(screen.getByRole('heading', { name: /Welcome to My Day AI/ })).toBeInTheDocument()
  expect(useStore.getState().settings.language).toBe('en')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByLabelText('What should I call you?')).toBeInTheDocument()
  // back to Serbian so that the other tests are not affected
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await pick(user, 'Language', 'sr-Latn')
  expect(getLanguage()).toBe('sr-Latn')
})

test('uvod: pita se samo za ime (bez vokativa), rod menja rečenice', async () => {
  const user = userEvent.setup()
  render(<Onboarding />)
  await clickNext(user)
  await user.type(screen.getByLabelText('Kako da te zovem?'), 'Petar')
  expect(screen.getByLabelText('Kako da te zovem?')).toHaveValue('Petar')
  expect(screen.queryByLabelText(/obraćam/i)).toBeNull()
  await user.click(screen.getByRole('radio', { name: /Ženski/ }))
  expect(useStore.getState().settings.gender).toBe('f')
  await clickNext(user, 5)
  await user.click(screen.getByRole('button', { name: 'Završi' }))
  expect(useStore.getState().settings).toMatchObject({ name: 'Petar', gender: 'f' })
})
