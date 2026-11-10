import { useRef, type TouchEvent } from 'react'

const MIN_DISTANCE = 60

/**
 * Horizontal swipe on a touch screen. A swipe counts when it is long enough and clearly more
 * sideways than up-down, so scrolling the page never changes the day.
 */
export function swipeDirection(dx: number, dy: number): 'left' | 'right' | null {
  if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 2) return null
  return dx < 0 ? 'left' : 'right'
}

/** Elements that use sideways movement themselves (sliders, text fields, scrolling strips). */
const OWN_GESTURE = 'input, textarea, select, [role="slider"], [data-no-swipe]'

export function useSwipe(onSwipe: (dir: 'left' | 'right') => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0]
      const own = e.target instanceof Element && e.target.closest(OWN_GESTURE)
      start.current = own || e.touches.length !== 1 ? null : { x: t.clientX, y: t.clientY }
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dir = swipeDirection(t.clientX - s.x, t.clientY - s.y)
      if (dir) onSwipe(dir)
    },
  }
}
