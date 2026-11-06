import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NumberInput, { stripLeadingZeros } from './NumberInput'

function Harness(props: {
  initial?: number | null
  min?: number
  max?: number
  step?: number
  nullable?: boolean
}) {
  const [v, setV] = useState<number | null>(props.initial ?? 5)
  return (
    <>
      <NumberInput
        aria-label="n"
        value={v}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={setV}
        onEmpty={props.nullable ? () => setV(null) : undefined}
      />
      <output data-testid="stored">{String(v)}</output>
    </>
  )
}

test('stripLeadingZeros keeps 0 and 0.5', () => {
  expect(stripLeadingZeros('03')).toBe('3')
  expect(stripLeadingZeros('007.5')).toBe('7.5')
  expect(stripLeadingZeros('0')).toBe('0')
  expect(stripLeadingZeros('0.5')).toBe('0.5')
  expect(stripLeadingZeros('')).toBe('')
})

test('field may be empty while typing (no forced 0)', async () => {
  const user = userEvent.setup()
  render(<Harness initial={5} />)
  const input = screen.getByLabelText('n')
  await user.clear(input)
  expect(input).toHaveValue('')
})

test('typing 3 after clearing gives "3", not "03"', async () => {
  const user = userEvent.setup()
  render(<Harness initial={5} />)
  const input = screen.getByLabelText('n')
  await user.clear(input)
  await user.type(input, '3')
  expect(input).toHaveValue('3')
  expect(screen.getByTestId('stored')).toHaveTextContent('3')
})

test('leading zeros are removed while typing', async () => {
  const user = userEvent.setup()
  render(<Harness initial={5} />)
  const input = screen.getByLabelText('n')
  await user.clear(input)
  await user.type(input, '007')
  expect(input).toHaveValue('7')
})

test('decimals work when step is fractional (dot and comma)', async () => {
  const user = userEvent.setup()
  render(<Harness initial={1} step={0.5} />)
  const input = screen.getByLabelText('n')
  await user.clear(input)
  await user.type(input, '2,5')
  expect(input).toHaveValue('2.5')
  expect(screen.getByTestId('stored')).toHaveTextContent('2.5')
})

test('integer fields reject a decimal point and letters', async () => {
  const user = userEvent.setup()
  render(<Harness initial={1} />)
  const input = screen.getByLabelText('n')
  await user.clear(input)
  await user.type(input, '1.a2')
  expect(input).toHaveValue('12')
})

test('max is enforced (clamped value is stored, text normalised on blur)', async () => {
  const user = userEvent.setup()
  render(<Harness initial={3} min={1} max={5} />)
  const input = screen.getByLabelText('n')
  await user.clear(input)
  await user.type(input, '9')
  expect(screen.getByTestId('stored')).toHaveTextContent('5')
  await user.tab()
  expect(input).toHaveValue('5')
})

test('min is enforced on blur for an empty field', async () => {
  const user = userEvent.setup()
  render(<Harness initial={3} min={1} max={5} />)
  const input = screen.getByLabelText('n')
  await user.clear(input)
  await user.tab()
  expect(input).toHaveValue('1')
  expect(screen.getByTestId('stored')).toHaveTextContent('1')
})

test('nullable field stays empty and stores null', async () => {
  const user = userEvent.setup()
  render(<Harness initial={7} nullable />)
  const input = screen.getByLabelText('n')
  await user.clear(input)
  await user.tab()
  expect(input).toHaveValue('')
  expect(screen.getByTestId('stored')).toHaveTextContent('null')
})

test('arrow keys step the value', async () => {
  const user = userEvent.setup()
  render(<Harness initial={2} min={0} max={3} />)
  const input = screen.getByLabelText('n')
  await user.click(input)
  await user.keyboard('{ArrowUp}{ArrowUp}')
  expect(input).toHaveValue('3')
  await user.keyboard('{ArrowDown}')
  expect(input).toHaveValue('2')
})
