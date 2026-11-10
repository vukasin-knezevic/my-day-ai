import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBackHandler, useBackPrompt } from '../lib/back'

const DURATION = 220 // ms, open / close / snap back
const CLOSE_FRACTION = 0.3 // dragged further than this share of the height closes the panel
const CLOSE_VELOCITY = 0.5 // px/ms downwards: a quick flick closes it too

/**
 * The app's own bottom panel (bottom sheet): used instead of the system pop-ups for lists and
 * pickers. Slides up smoothly, follows the finger when dragged down (by the handle, the title or
 * the list when it is scrolled to the top), closes with Escape, a tap outside or the button inside.
 * The page behind does not move while it is open.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
  dirty = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Something was typed inside: "Back" asks before it is thrown away. */
  dirty?: boolean
}) {
  const [closing, setClosing] = useState(false)
  const [shown, setShown] = useState(open)
  const panel = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const grab = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  // "Back" closes the panel instead of leaving the screen
  useBackHandler('overlay', open, () =>
    dirty ? useBackPrompt.getState().ask({ kind: 'discard', discard: onClose }) : onClose(),
  )

  // keep it mounted for the exit animation
  useEffect(() => {
    if (open) {
      setShown(true)
      setClosing(false)
      return
    }
    if (!shown) return
    setClosing(true)
    const id = setTimeout(() => {
      setShown(false)
      setClosing(false)
    }, DURATION)
    return () => clearTimeout(id)
  }, [open, shown])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      previous?.focus?.()
    }
  }, [open])

  // the page behind must not scroll while the panel is open
  useEffect(() => {
    if (!shown) return
    const html = document.documentElement
    const before = [html.style.overflow, document.body.style.overflow]
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = before[0]
      document.body.style.overflow = before[1]
    }
  }, [shown])

  const setOffset = useCallback((dy: number, animate: boolean) => {
    const el = panel.current
    if (!el) return
    el.style.transition = animate
      ? `transform ${DURATION}ms ease-out, opacity ${DURATION}ms`
      : 'none'
    el.style.transform = dy > 0 || animate ? `translateY(${dy}px)` : ''
    const h = el.offsetHeight || 1
    if (backdrop.current) {
      backdrop.current.style.transition = animate ? `opacity ${DURATION}ms ease-out` : 'none'
      backdrop.current.style.opacity = String(Math.max(0, 1 - dy / h))
    }
  }, [])

  // dragging: the panel follows the finger exactly; on release it closes or snaps back
  useEffect(() => {
    const el = panel.current
    const handle = grab.current
    const list = scroller.current
    if (!shown || !el || !handle || !list) return

    let startY = 0
    let dragging = false
    let dy = 0
    let samples: { t: number; y: number }[] = []

    const begin = (y: number) => {
      startY = y
      dy = 0
      dragging = true
      samples = [{ t: performance.now(), y }]
    }
    const move = (y: number) => {
      dy = Math.max(0, y - startY)
      samples.push({ t: performance.now(), y })
      if (samples.length > 6) samples.shift()
      setOffset(dy, false)
    }
    const end = () => {
      if (!dragging) return
      dragging = false
      // speed over the last 100 ms before release (a pause before letting go is not a flick)
      const recent = samples.filter((s) => s.t >= performance.now() - 100)
      const first = recent[0]
      const last = recent[recent.length - 1]
      const dt = first && last ? last.t - first.t : 0
      const velocity = dt > 0 && first && last ? (last.y - first.y) / dt : 0
      const height = el.offsetHeight
      if (dy > 0 && (dy > height * CLOSE_FRACTION || velocity > CLOSE_VELOCITY)) {
        setOffset(height, true)
        onCloseRef.current()
      } else {
        setOffset(0, true)
      }
    }

    // handle + title: pointer events (touch-action: none keeps the browser from scrolling)
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      begin(e.clientY)
      handle.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (dragging) move(e.clientY)
    }
    const onUp = () => end()

    // the list: scrolls normally; the drag starts only when it is at the top and pulled down
    let listStart = 0
    let listTracking = false
    const onTouchStart = (e: TouchEvent) => {
      listStart = e.touches[0]?.clientY ?? 0
      listTracking = true
    }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY
      if (!listTracking || y === undefined) return
      if (!dragging) {
        if (list.scrollTop <= 0 && y - listStart > 0) begin(listStart)
        else return
      }
      if (e.cancelable) e.preventDefault()
      move(y)
    }
    const onTouchEnd = () => {
      listTracking = false
      end()
    }

    handle.addEventListener('pointerdown', onDown)
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onUp)
    list.addEventListener('touchstart', onTouchStart, { passive: true })
    list.addEventListener('touchmove', onTouchMove, { passive: false })
    list.addEventListener('touchend', onTouchEnd)
    list.addEventListener('touchcancel', onTouchEnd)
    return () => {
      handle.removeEventListener('pointerdown', onDown)
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
      list.removeEventListener('touchstart', onTouchStart)
      list.removeEventListener('touchmove', onTouchMove)
      list.removeEventListener('touchend', onTouchEnd)
      list.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [shown, setOffset])

  if (!shown) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain">
      <div
        ref={backdrop}
        data-testid="sheet-backdrop"
        aria-hidden
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          closing ? 'opacity-0' : 'anim-fade'
        }`}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden overscroll-contain rounded-t-3xl border border-b-0 border-slate-200 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none transition duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
          closing ? 'translate-y-full opacity-0' : 'anim-sheet'
        }`}
      >
        <div
          ref={grab}
          data-testid="sheet-grab"
          className="shrink-0 cursor-grab touch-none px-4 pt-4"
        >
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700"
          />
          <h2 className="mb-2 text-center text-base font-semibold">{title}</h2>
        </div>
        <div
          ref={scroller}
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
