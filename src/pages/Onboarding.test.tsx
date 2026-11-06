import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Onboarding from './Onboarding'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

test('onboarding se prolazi samo tastaturom: Enter = Dalje / Završi, Esc = Nazad', async () => {
  const user = userEvent.setup()
  render(<Onboarding />)
  await user.type(screen.getByLabelText('Kako da te zovem?'), 'Mila')
  await user.keyboard('{Enter}')
  expect(screen.getByText(/Korak 2 od/)).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getByText(/Korak 1 od/)).toBeInTheDocument()
  expect(screen.getByLabelText('Kako da te zovem?')).toHaveValue('Mila')
  // focus moves to the first field of every new step, so Enter keeps working without the mouse
  await user.keyboard('{Enter}{Enter}{Enter}{Enter}{Enter}')
  expect(screen.getByText(/Korak 6 od 6/)).toBeInTheDocument()
  await user.keyboard('{Enter}')
  expect(useStore.getState().settings.onboarded).toBe(true)
  expect(useStore.getState().settings.name).toBe('Mila')
})

test('brisanje broja u onboardingu ne ostavlja nulu ispred', async () => {
  const user = userEvent.setup()
  render(<Onboarding />)
  await user.click(screen.getByRole('button', { name: 'Dalje' }))
  const sleep = screen.getByLabelText('Cilj sna (sati)')
  await user.clear(sleep)
  expect(sleep).toHaveValue('')
  await user.type(sleep, '7')
  expect(sleep).toHaveValue('7')
})

test('izbor AI režima i imena nagrade u onboardingu', async () => {
  const user = userEvent.setup()
  render(<Onboarding />)
  await user.click(screen.getByRole('button', { name: 'Dalje' }))
  await user.click(screen.getByRole('button', { name: 'Dalje' }))
  await user.click(screen.getByRole('button', { name: 'Dalje' }))
  const reward = screen.getByLabelText('Naziv nagrade')
  expect(reward).toHaveValue('Vreme za zabavu')
  await user.clear(reward)
  await user.type(reward, 'PS5 vreme')
  await user.click(screen.getByRole('button', { name: 'Dalje' }))
  await user.click(screen.getByRole('button', { name: 'Dalje' }))
  expect(screen.getByLabelText(/Ručni \(besplatno\)/)).toBeChecked()
  expect(screen.queryByLabelText(/možeš i kasnije/)).not.toBeInTheDocument()
  await user.click(screen.getByLabelText(/API \(plaća se po upotrebi\)/))
  expect(screen.getByLabelText(/možeš i kasnije/)).toBeInTheDocument()
  expect(screen.getByText(/Nikome ga ne/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Završi' }))
  const s = useStore.getState().settings
  expect(s).toMatchObject({ aiMode: 'api', rewardName: 'PS5 vreme', onboarded: true })
})
