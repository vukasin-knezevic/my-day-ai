import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IosInstallHint from './IosInstallHint'
import { useStore } from '../store'
import { emptyData } from '../lib/defaults'
import type { Env } from '../lib/ios'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1'
const iphone: Env = { userAgent: IPHONE, standalone: false, hasNotifications: false }

beforeEach(() => useStore.setState({ ...emptyData(), hydrated: true }))

test('kartica „Dodaj na početni ekran" na iPhone-u: može da se zatvori i ne vraća se', async () => {
  const user = userEvent.setup()
  const { rerender } = render(<IosInstallHint env={iphone} />)
  expect(screen.getByText(/Deli ⬆️ → Dodaj na početni ekran/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Zatvori' }))
  expect(useStore.getState().settings.iosHintDismissed).toBe(true)
  expect(screen.queryByText(/Deli/)).not.toBeInTheDocument()
  rerender(<IosInstallHint env={iphone} />)
  expect(screen.queryByText(/Deli/)).not.toBeInTheDocument()
})

test('nema kartice na drugim uređajima ni kad je već instalirano', () => {
  render(<IosInstallHint env={{ ...iphone, standalone: true }} />)
  expect(screen.queryByText(/Deli/)).not.toBeInTheDocument()
  render(
    <IosInstallHint env={{ userAgent: 'Android', standalone: false, hasNotifications: true }} />,
  )
  expect(screen.queryByText(/Deli/)).not.toBeInTheDocument()
})
