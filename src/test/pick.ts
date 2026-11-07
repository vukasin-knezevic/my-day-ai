import type { UserEvent } from '@testing-library/user-event'
import { screen, waitFor, within } from '@testing-library/react'

/** Chooses an option of the app's own drop-down (bottom panel): open it, then tap the option. */
export async function pick(user: UserEvent, label: string | RegExp, value: string) {
  await user.click(screen.getByLabelText(label))
  const list = await screen.findByRole('listbox')
  const option = within(list)
    .getAllByRole('option')
    .find((o) => o.getAttribute('data-value') === value)
  if (!option) throw new Error(`No option with value "${value}"`)
  await user.click(option)
  await panelGone()
}

/** Sets a time field (the app's own wheels): open it, tap hour and minute, press "Gotovo". */
export async function setTime(user: UserEvent, label: string | RegExp, hhmm: string) {
  const [h, m] = hhmm.split(':')
  await user.click(screen.getByLabelText(label))
  const hours = within(await screen.findByRole('listbox', { name: 'Sati' }))
  await user.click(hours.getByRole('option', { name: String(Number(h)).padStart(2, '0') }))
  const minutes = within(screen.getByRole('listbox', { name: 'Minuti' }))
  await user.click(minutes.getByRole('option', { name: m }))
  await user.click(screen.getByRole('button', { name: 'Gotovo' }))
  await panelGone()
}

/** The panel slides away for a moment after closing: wait until it is gone. */
export const panelGone = () =>
  waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
