import type { UserEvent } from '@testing-library/user-event'
import { screen, within } from '@testing-library/react'

/** Chooses an option of the app's own drop-down (bottom panel): open it, then tap the option. */
export async function pick(user: UserEvent, label: string | RegExp, value: string) {
  await user.click(screen.getByLabelText(label))
  const list = await screen.findByRole('listbox')
  const option = within(list)
    .getAllByRole('option')
    .find((o) => o.getAttribute('data-value') === value)
  if (!option) throw new Error(`No option with value "${value}"`)
  await user.click(option)
}
