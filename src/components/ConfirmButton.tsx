import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui'
import { useT } from '../i18n'

export const CONFIRM_MS = 4000

/**
 * For deleting what cannot be brought back: the first click only asks, the second one does it.
 * The question goes away by itself after a few seconds or on a touch anywhere else. (Blur alone is
 * not enough: Safari on iPhone does not focus a button on touch, so it never blurs.)
 * With `ask={false}` it behaves like a plain button.
 */
export default function ConfirmButton({
  label,
  onConfirm,
  ask = true,
  children,
}: {
  /** Accessible name, e.g. "Delete subject Math" */
  label: string
  onConfirm: () => void
  ask?: boolean
  children: ReactNode
}) {
  const { t } = useT()
  const [armed, setArmed] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), CONFIRM_MS)
    const outside = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setArmed(false)
    }
    document.addEventListener('pointerdown', outside, true)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', outside, true)
    }
  }, [armed])

  return (
    <Button
      ref={ref}
      variant={armed ? 'danger' : 'ghost'}
      aria-label={armed ? `${label}: ${t('common.sure')}` : label}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (ask && !armed) return setArmed(true)
        setArmed(false)
        onConfirm()
      }}
    >
      {armed ? t('common.sure') : children}
    </Button>
  )
}
