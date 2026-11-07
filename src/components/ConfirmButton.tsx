import { useState, type ReactNode } from 'react'
import { Button } from './ui'
import { useT } from '../i18n'

/**
 * For deleting what cannot be brought back: the first click only asks, the second one does it.
 * Clicking elsewhere cancels. With `ask={false}` it behaves like a plain button.
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
  return (
    <Button
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
