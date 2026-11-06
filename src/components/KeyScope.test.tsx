import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KeyScope from './KeyScope'

function setup() {
  const onEnter = vi.fn()
  const onEscape = vi.fn()
  render(
    <KeyScope onEnter={onEnter} onEscape={onEscape}>
      <input aria-label="polje" />
      <textarea aria-label="vise" />
      <button>Klik</button>
    </KeyScope>,
  )
  return { onEnter, onEscape, user: userEvent.setup() }
}

test('Enter in a text field runs onEnter, Escape runs onEscape', async () => {
  const { onEnter, onEscape, user } = setup()
  await user.click(screen.getByLabelText('polje'))
  await user.keyboard('{Enter}')
  expect(onEnter).toHaveBeenCalledTimes(1)
  await user.keyboard('{Escape}')
  expect(onEscape).toHaveBeenCalledTimes(1)
})

test('Enter in a textarea does nothing, Ctrl+Enter runs onEnter', async () => {
  const { onEnter, user } = setup()
  await user.click(screen.getByLabelText('vise'))
  await user.keyboard('{Enter}')
  expect(onEnter).not.toHaveBeenCalled()
  await user.keyboard('{Control>}{Enter}{/Control}')
  expect(onEnter).toHaveBeenCalledTimes(1)
})

test('Enter on a button keeps its own behaviour', async () => {
  const { onEnter, user } = setup()
  screen.getByRole('button', { name: 'Klik' }).focus()
  await user.keyboard('{Enter}')
  expect(onEnter).not.toHaveBeenCalled()
})
