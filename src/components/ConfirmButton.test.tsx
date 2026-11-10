import { afterEach, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ConfirmButton, { CONFIRM_MS } from './ConfirmButton'

afterEach(() => vi.useRealTimers())

function setup() {
  const onConfirm = vi.fn()
  render(
    <>
      <ConfirmButton label="Obriši predmet" onConfirm={onConfirm}>
        ✕
      </ConfirmButton>
      <p>negde drugde</p>
    </>,
  )
  return onConfirm
}
const button = () => screen.getByRole('button')

test('prvi dodir pita, drugi briše', () => {
  const onConfirm = setup()
  fireEvent.click(button())
  expect(button()).toHaveTextContent('Sigurno?')
  expect(onConfirm).not.toHaveBeenCalled()
  fireEvent.click(button())
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(button()).toHaveTextContent('✕')
})

test('A-08: „Sigurno?“ se vraća na dodir sa strane i bez fokusa (iPhone)', () => {
  const onConfirm = setup()
  fireEvent.click(button())
  // no focus and no blur happen on iOS: only the touch elsewhere
  fireEvent.pointerDown(screen.getByText('negde drugde'))
  expect(button()).toHaveTextContent('✕')
  fireEvent.click(button())
  expect(onConfirm).not.toHaveBeenCalled()
})

test('A-08: „Sigurno?“ se samo vraća posle 4 s', () => {
  vi.useFakeTimers()
  setup()
  fireEvent.click(button())
  act(() => void vi.advanceTimersByTime(CONFIRM_MS - 1))
  expect(button()).toHaveTextContent('Sigurno?')
  act(() => void vi.advanceTimersByTime(2))
  expect(button()).toHaveTextContent('✕')
})

test('dodir na samo dugme ne poništava pitanje', () => {
  const onConfirm = setup()
  fireEvent.click(button())
  fireEvent.pointerDown(button())
  fireEvent.click(button())
  expect(onConfirm).toHaveBeenCalledTimes(1)
})
