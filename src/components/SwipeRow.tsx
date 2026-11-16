import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { EDGE_PX } from '../lib/back'
import { useStore } from '../store'

const COMMIT_PX = 80 // dragged this far = the action happens
const START_PX = 10 // below this it is still a tap

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A row that can also be swiped: right = `onRight` (done), left = `onLeft` (move). It is only an EXTRA:
 * every action keeps its normal button, so keyboard and screen-reader users lose nothing (the hints
 * behind the row are hidden from them). The row is marked `data-no-swipe`, so the page-level swipe
 * (next / previous day) does not start on it.
 */
export default function SwipeRow({
  children,
  enabled = true,
  onRight,
  onLeft,
  rightHint,
  leftHint,
  className = '',
}: {
  children: ReactNode
  enabled?: boolean
  onRight?: () => void
  onLeft?: () => void
  rightHint: string
  leftHint: string
  className?: string
}) {
  const animations = useStore((s) => s.settings.animations)
  const motion = animations && !reduced()
  const start = useRef<{ x: number; y: number } | null>(null)
  const lock = useRef<'h' | 'v' | null>(null)
  const [dx, setDx] = useState(0)
  const [flash, setFlash] = useState<'right' | 'left' | null>(null)

  const reset = () => {
    start.current = null
    lock.current = null
    setDx(0)
  }

  const down = (e: TouchEvent) => {
    const t = e.touches[0]
    // from the very edge of the screen it is "Back"; a second finger is a pinch
    if (!enabled || e.touches.length !== 1 || t.clientX <= EDGE_PX) return
    // buttons, fields and links inside the row keep their own gesture
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return
    start.current = { x: t.clientX, y: t.clientY }
    lock.current = null
  }
  const move = (e: TouchEvent) => {
    const s = start.current
    if (!s) return
    const t = e.touches[0]
    const mx = t.clientX - s.x
    const my = t.clientY - s.y
    if (!lock.current) {
      if (Math.abs(mx) < START_PX && Math.abs(my) < START_PX) return
      lock.current = Math.abs(mx) > Math.abs(my) * 1.5 ? 'h' : 'v'
    }
    if (lock.current === 'h' && motion) {
      const allowed = (mx > 0 && onRight) || (mx < 0 && onLeft)
      setDx(allowed ? Math.max(-120, Math.min(120, mx)) : 0)
    }
  }
  const up = (e: TouchEvent) => {
    const s = start.current
    const horizontal = lock.current === 'h'
    reset()
    if (!s || !horizontal) return
    const mx = e.changedTouches[0].clientX - s.x
    const my = e.changedTouches[0].clientY - s.y
    if (Math.abs(mx) < COMMIT_PX || Math.abs(mx) < Math.abs(my) * 2) return
    const act = mx > 0 ? onRight : onLeft
    if (!act) return
    if (motion) {
      setFlash(mx > 0 ? 'right' : 'left')
      setTimeout(() => setFlash(null), 450)
    }
    act()
  }

  const showing = dx > 0 ? 'right' : dx < 0 ? 'left' : null
  return (
    <li
      data-no-swipe
      data-testid="swipe-row"
      className={`relative overflow-hidden rounded-xl ${className}`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center px-4 text-sm font-semibold ${
          showing === 'left'
            ? 'justify-end bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100'
            : 'justify-start bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
        } ${showing ? '' : 'invisible'}`}
      >
        {showing === 'left' ? `➜ ${leftHint}` : `✓ ${rightHint}`}
      </div>
      <div
        onTouchStart={down}
        onTouchMove={move}
        onTouchEnd={up}
        onTouchCancel={reset}
        style={{
          touchAction: 'pan-y',
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dx || !motion ? undefined : 'transform 160ms ease-out',
        }}
        className={`relative rounded-xl border border-slate-200 bg-white p-2 text-sm dark:border-slate-800/60 dark:bg-slate-900 ${
          flash === 'right'
            ? 'ring-2 ring-emerald-500'
            : flash === 'left'
              ? 'ring-2 ring-blue-500'
              : ''
        }`}
      >
        {children}
      </div>
    </li>
  )
}
