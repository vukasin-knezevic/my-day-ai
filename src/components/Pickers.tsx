import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import Sheet from './Sheet'
import { inputCls } from './styles'
import { invalidCls, useFieldState } from './fieldContext'
import { useT } from '../i18n'
import { useStore } from '../store'
import { formatDateNumeric, formatTimeOfDay } from '../lib/dates'

/* ---------------- time: wheels "hours : minutes" ---------------- */

const ITEM = 44 // px height of one wheel row
const HEIGHT = 220

interface WheelItem {
  value: number
  label: string
}

/** One scrolling wheel. Snaps to a row; rows can also be tapped (and used with the keyboard). */
function Wheel({
  items,
  value,
  onChange,
  label,
}: {
  items: WheelItem[]
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const index = Math.max(
    0,
    items.findIndex((i) => i.value === value),
  )

  // put the current row in the middle when opened and when the value changes from outside
  useEffect(() => {
    const el = box.current
    if (!el) return
    const top = index * ITEM
    if (Math.abs(el.scrollTop - top) <= 2) return
    if (typeof el.scrollTo === 'function') el.scrollTo({ top, behavior: 'smooth' })
    else el.scrollTop = top
  }, [index])
  useEffect(() => () => clearTimeout(timer.current), [])

  function onScroll() {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = box.current
      if (!el) return
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)))
      if (items[i].value !== value) onChange(items[i].value)
    }, 80)
  }

  return (
    <div className="relative flex-1" style={{ height: HEIGHT }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-1 rounded-xl bg-blue-100 dark:bg-blue-950"
        style={{ top: (HEIGHT - ITEM) / 2, height: ITEM }}
      />
      <div
        ref={box}
        role="listbox"
        aria-label={label}
        onScroll={onScroll}
        className="relative h-full snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBlock: (HEIGHT - ITEM) / 2 }}
      >
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            role="option"
            aria-selected={it.value === value}
            onClick={() => onChange(it.value)}
            className={`flex w-full snap-center items-center justify-center text-xl tabular-nums transition-colors ${
              it.value === value ? 'font-bold text-blue-900 dark:text-blue-200' : 'text-slate-500'
            }`}
            style={{ height: ITEM }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const range = (from: number, to: number, label = (n: number) => pad(n)): WheelItem[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: label(from + i) }))
const HOURS_24 = range(0, 23)
const HOURS_12 = range(1, 12, String)
const MINUTES = range(0, 59)

const parse = (v: string) => {
  const [h, m] = v.split(':').map(Number)
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 }
}

/** Time field: shows the time in the chosen format and opens wheels "hours : minutes". Value is always 'HH:mm'. */
export function TimeField({
  value,
  onChange,
  className = '',
  id,
  disabled,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  id?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  const { t } = useT()
  const { invalid, optional } = useFieldState()
  const format = useStore((s) => s.settings.timeFormat)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(parse(value))
  const title = ariaLabel ?? t('common.time')

  const is12 = format === '12h'
  const pm = draft.h >= 12
  const hour12 = draft.h % 12 || 12
  const set24 = (h: number, m: number) => setDraft({ h, m })

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        data-value={value}
        onClick={() => {
          setDraft(parse(value))
          setOpen(true)
        }}
        aria-invalid={invalid || undefined}
        className={`${inputCls} ${invalid ? invalidCls : ''} text-left tabular-nums disabled:opacity-50 ${className}`}
      >
        {value ? formatTimeOfDay(value, format) : ' '}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="flex items-center gap-1">
          {is12 ? (
            <Wheel
              label={t('common.hours')}
              items={HOURS_12}
              value={hour12}
              onChange={(h) => set24((h % 12) + (pm ? 12 : 0), draft.m)}
            />
          ) : (
            <Wheel
              label={t('common.hours')}
              items={HOURS_24}
              value={draft.h}
              onChange={(h) => set24(h, draft.m)}
            />
          )}
          <span aria-hidden className="text-2xl font-bold">
            :
          </span>
          <Wheel
            label={t('common.minutes')}
            items={MINUTES}
            value={draft.m}
            onChange={(m) => set24(draft.h, m)}
          />
          {is12 && (
            <Wheel
              // AM / PM are international marks of the 12-hour clock, the same in every language
              label="AM / PM"
              items={[
                { value: 0, label: 'AM' },
                { value: 1, label: 'PM' },
              ]}
              value={pm ? 1 : 0}
              onChange={(p) => set24((draft.h % 12) + (p ? 12 : 0), draft.m)}
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(`${pad(draft.h)}:${pad(draft.m)}`)
            setOpen(false)
          }}
          className="mt-3 min-h-12 w-full rounded-xl bg-blue-600 px-4 py-2 text-base font-medium text-white transition hover:bg-blue-700"
        >
          {t('common.done')}
        </button>
        {optional && value && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
            className="mt-2 min-h-12 w-full rounded-xl px-4 py-2 text-base font-medium text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
          >
            {t('picker.clearTime')}
          </button>
        )}
      </Sheet>
    </>
  )
}

/* ---------------- date: system date picker, shown as DD.MM.YYYY ---------------- */

/**
 * The phone's date picker stays (it is nice), but the text is always DD.MM.YYYY.
 * A real <input type="date"> lies invisibly over the text, so a tap opens the system picker.
 */
export function DateField({
  value,
  onChange,
  className = '',
  ...rest
}: {
  value: string
  onChange: (e: { target: { value: string } }) => void
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'className'>) {
  const { invalid } = useFieldState()
  return (
    <div
      className={`${inputCls} ${invalid ? invalidCls : ''} relative min-h-[2.75rem] tabular-nums focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 ${className}`}
    >
      <span aria-hidden>{value ? formatDateNumeric(value) : ' '}</span>
      <input
        {...rest}
        type="date"
        value={value}
        onChange={(e) => onChange({ target: { value: e.target.value } })}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            /* the picker may only open on a real tap */
          }
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </div>
  )
}
