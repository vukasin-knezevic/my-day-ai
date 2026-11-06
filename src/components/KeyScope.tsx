import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

/**
 * Keyboard shortcuts for a step, form or dialog:
 * - Enter runs `onEnter` (not in a textarea unless Ctrl/Cmd is held, and not on buttons
 *   or links, which keep their own Enter behaviour),
 * - Escape runs `onEscape`.
 */
export default function KeyScope({
  onEnter,
  onEscape,
  children,
  className,
  focusOnMount,
  focusKey,
  ...rest
}: {
  onEnter?: () => void
  onEscape?: () => void
  children: ReactNode
  className?: string
  /** Focus the container when it appears, so Enter / Escape work right away (dialogs). */
  focusOnMount?: boolean
  /** When this value changes, focus moves to the first field inside (e.g. on a new wizard step). */
  focusKey?: unknown
  role?: string
  'aria-label'?: string
  'aria-modal'?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusOnMount) ref.current?.focus()
  }, [focusOnMount])
  useEffect(() => {
    if (focusKey === undefined) return
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea')
    ;(first ?? ref.current)?.focus()
  }, [focusKey])

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.defaultPrevented) return
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault()
      onEscape()
      return
    }
    if (e.key !== 'Enter' || !onEnter || e.nativeEvent.isComposing) return
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'TEXTAREA') {
      if (!(e.ctrlKey || e.metaKey)) return
    } else if (tag === 'BUTTON' || tag === 'A') return
    e.preventDefault()
    onEnter()
  }
  return (
    <div
      {...rest}
      ref={ref}
      tabIndex={focusOnMount || focusKey !== undefined ? -1 : undefined}
      className={`${className ?? ''} ${focusOnMount || focusKey !== undefined ? 'outline-none' : ''}`}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  )
}
