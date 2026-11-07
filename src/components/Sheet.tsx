import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * The app's own bottom panel (bottom sheet): used instead of the system pop-ups for lists and
 * pickers. Slides up smoothly, closes with Escape, a tap outside or the button inside.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const [closing, setClosing] = useState(false)
  const [shown, setShown] = useState(open)
  const panel = useRef<HTMLDivElement>(null)

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
    }, 160)
    return () => clearTimeout(id)
  }, [open, shown])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!shown) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        aria-hidden
        className={`absolute inset-0 bg-black/50 transition-opacity duration-150 ${
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
        className={`relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-b-0 border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none transition duration-150 dark:border-slate-700 dark:bg-slate-900 ${
          closing ? 'translate-y-full opacity-0' : 'anim-sheet'
        }`}
      >
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700"
        />
        <h2 className="mb-2 text-center text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}
