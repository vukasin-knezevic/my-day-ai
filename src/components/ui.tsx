import {
  Children,
  isValidElement,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import Sheet from './Sheet'
import { DateField, TimeField } from './Pickers'
import { inputCls } from './styles'
import { FieldContext, invalidCls, useFieldState } from './fieldContext'
import { useT } from '../i18n'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </section>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'soft'
}
export function Button({ variant = 'primary', className = '', ...p }: BtnProps) {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    soft: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant]
  return (
    <button
      type="button"
      {...p}
      className={`min-h-10 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
    />
  )
}

/**
 * A labelled control.
 * - `required`: a discreet * after the name; the field looks like any other until a final action fails.
 * - `optional`: "(optional)" after the name.
 * - `error`: red border + short message (only pass it after the user tried to finish).
 * The marks are drawn with CSS, so the label text itself stays just the name.
 */
export function Field({
  label,
  children,
  required,
  optional,
  error,
}: {
  label: string
  children: ReactNode
  required?: boolean
  optional?: boolean
  error?: string
}) {
  const { t } = useT()
  const mark = required
    ? "after:ml-0.5 after:text-slate-500 after:content-['*']"
    : optional
      ? 'after:ml-1 after:font-normal after:text-slate-500 after:content-[var(--suffix)]'
      : ''
  return (
    <label className="block text-sm">
      <span
        className={`mb-1 block font-medium text-slate-700 dark:text-slate-300 ${mark}`}
        style={
          optional
            ? ({ '--suffix': JSON.stringify(`(${t('common.optional')})`) } as React.CSSProperties)
            : undefined
        }
      >
        {label}
      </span>
      <FieldContext.Provider value={{ required: !!required, invalid: !!error }}>
        {children}
      </FieldContext.Provider>
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  )
}

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  const { invalid, required } = useFieldState()
  // time and date fields use the app's own pickers
  if (p.type === 'time')
    return (
      <TimeField
        value={String(p.value ?? '')}
        onChange={(v) => p.onChange?.({ target: { value: v } } as never)}
        className={p.className}
        id={p.id}
        disabled={p.disabled}
        ariaLabel={p['aria-label']}
      />
    )
  if (p.type === 'date')
    return (
      <DateField
        id={p.id}
        aria-label={p['aria-label']}
        disabled={p.disabled}
        min={p.min}
        max={p.max}
        required={p.required}
        value={String(p.value ?? '')}
        onChange={(e) => p.onChange?.(e as never)}
        className={p.className}
      />
    )
  // no browser suggestions in the fields unless a field asks for them
  return (
    <input
      autoComplete="off"
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
      {...p}
      className={`${inputCls} ${invalid ? invalidCls : ''} ${p.className ?? ''}`}
    />
  )
}

type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean }
type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  value?: string | number
  onChange?: (e: { target: { value: string } }) => void
}

/** Text of a React node (for the label of an option). */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

/**
 * A drop-down list that opens the app's own bottom panel instead of the system menu.
 * Same use as <select>: `<Select value onChange={(e) => e.target.value}><option value="a">A</option></Select>`.
 */
export function Select({
  value,
  onChange,
  children,
  className = '',
  disabled,
  id,
  ...rest
}: SelectProps) {
  const { t } = useT()
  const { invalid } = useFieldState()
  const [open, setOpen] = useState(false)
  const options = Children.toArray(children)
    .filter((c): c is ReactElement<OptionProps> => isValidElement(c) && c.type === 'option')
    .map((c) => ({
      value: String(c.props.value ?? textOf(c.props.children)),
      label: textOf(c.props.children),
      disabled: c.props.disabled,
    }))
  const current = options.find((o) => o.value === String(value ?? ''))
  const title = rest['aria-label'] ?? t('common.choose')
  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest['aria-label']}
        data-value={String(value ?? '')}
        onClick={() => setOpen(true)}
        aria-invalid={invalid || undefined}
        className={`${inputCls} ${invalid ? invalidCls : ''} flex items-center justify-between gap-2 text-left disabled:opacity-50 ${className}`}
      >
        <span className="truncate">{current?.label ?? ' '}</span>
        <span aria-hidden className="text-slate-500">
          ▾
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div role="listbox" aria-label={title} className="space-y-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === String(value ?? '')}
              data-value={o.value}
              disabled={o.disabled}
              onClick={() => {
                onChange?.({ target: { value: o.value } })
                setOpen(false)
              }}
              className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-base transition active:scale-[0.99] ${
                o.value === String(value ?? '')
                  ? 'bg-blue-100 font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {o.label}
              {o.value === String(value ?? '') && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">{children}</h1>
      {sub && <p className="text-sm text-slate-600 dark:text-slate-400">{sub}</p>}
    </header>
  )
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}
