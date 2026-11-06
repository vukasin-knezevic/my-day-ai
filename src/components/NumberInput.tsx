import { useEffect, useRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Input } from './ui'

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max' | 'step'
> & {
  value: number | null | undefined
  onChange: (value: number) => void
  /** If set, an empty field calls this (e.g. to store `null`) instead of `onChange(fallback)`. */
  onEmpty?: () => void
  min?: number
  max?: number
  step?: number
  /** Allow decimals (default: true when `step` is fractional, otherwise false). */
  decimal?: boolean
}

const clamp = (n: number, min?: number, max?: number) =>
  Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))

/** Removes leading zeros ("03" -> "3", "007.5" -> "7.5"), keeps "0" and "0.5". */
export function stripLeadingZeros(s: string): string {
  return s.replace(/^(-?)0+(?=\d)/, '$1')
}

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

/**
 * One number field for the whole app.
 * - The field may be empty while typing (no forced "0") and never shows leading zeros.
 * - The parent always gets a valid number (clamped to min/max), so saving with Enter works
 *   even without leaving the field. On blur the text is normalised to the stored value.
 */
export default function NumberInput({
  value,
  onChange,
  onEmpty,
  min,
  max,
  step = 1,
  decimal,
  onBlur,
  onKeyDown,
  ...rest
}: Props) {
  const allowDecimal = decimal ?? !Number.isInteger(step)
  const allowNegative = (min ?? 0) < 0
  const [text, setText] = useState(fmt(value))
  // last value we reported: a different incoming value (reset, import, ...) replaces the text
  const emitted = useRef<number | null | undefined>(value)

  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value
      setText(fmt(value))
    }
  }, [value])

  function emit(n: number) {
    emitted.current = n
    onChange(n)
  }

  function handleChange(raw: string) {
    let s = raw.replace(',', '.')
    const re = allowDecimal
      ? allowNegative
        ? /^-?\d*\.?\d*$/
        : /^\d*\.?\d*$/
      : allowNegative
        ? /^-?\d*$/
        : /^\d*$/
    if (!re.test(s)) return
    s = stripLeadingZeros(s)
    setText(s)
    if (s === '' || s === '-' || s === '.') {
      if (onEmpty) {
        emitted.current = null
        onEmpty()
      } else emit(clamp(0, min, max))
      return
    }
    const n = Number(s)
    if (Number.isFinite(n)) emit(clamp(n, min, max))
  }

  function stepBy(dir: 1 | -1) {
    const base = text === '' ? (min ?? 0) - (dir === 1 ? step : 0) : Number(text)
    const n = clamp(Number((base + dir * step).toFixed(6)), min, max)
    setText(String(n))
    emit(n)
  }

  const numeric = text === '' ? undefined : Number(text)
  return (
    <Input
      {...rest}
      type="text"
      role="spinbutton"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={numeric}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          stepBy(1)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          stepBy(-1)
        }
        onKeyDown?.(e)
      }}
      onBlur={(e) => {
        // validate on leaving the field: show the (clamped) stored value, or keep empty if allowed
        if (text === '' && onEmpty) setText('')
        else if (text === '' || text === '-' || text === '.') {
          const n = clamp(0, min, max)
          setText(String(n))
          emit(n)
        } else {
          const n = clamp(Number(text), min, max)
          setText(String(n))
          if (n !== Number(text) || emitted.current !== n) emit(n)
        }
        onBlur?.(e)
      }}
    />
  )
}
