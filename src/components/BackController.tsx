import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { handleBack, isEdgeBackSwipe, useBackPrompt } from '../lib/back'
import { currentEnv, isIos } from '../lib/ios'
import KeyScope from './KeyScope'
import { Button } from './ui'
import { useT } from '../i18n'

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** The app-side "Back" (arrow in a header, the iPhone edge swipe): never offers to leave the app. */
export function useAppBack() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const path = useRef(pathname)
  path.current = pathname
  return useCallback(
    (canExit = false) =>
      handleBack({
        scrollY: () => window.scrollY,
        scrollTop: () => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }),
        atHome: () => path.current === '/',
        goHome: () => navigate('/', { replace: true }),
        canExit,
      }),
    [navigate],
  )
}

/**
 * Connects the system Back to `handleBack`.
 *
 * The browser only tells us that Back happened after it already moved one step in the history.
 * So the app keeps one spare step under itself and, after every Back, goes forward again to where
 * it was. The view never changes by itself; what changes is decided by `handleBack` alone.
 */
export default function BackController() {
  const { t } = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const back = useAppBack()
  const prompt = useBackPrompt((s) => s.prompt)
  const close = useBackPrompt((s) => s.close)

  const here = useRef(location)
  here.current = location
  const leaving = useRef(false)

  useEffect(() => {
    // the spare step: the same address once more
    window.history.pushState(window.history.state, '', window.location.href)
    const onPop = () => {
      if (leaving.current) return window.history.back()
      // an address typed or opened by hand makes a fresh step (without the router's mark): that is a
      // visit to a screen, not Back
      if (window.history.state === null) return
      const { pathname, search } = here.current
      const step = back(true)
      // stay where we were, unless the step itself was "go to Today"
      navigate(step === 'home' ? '/' : `${pathname}${search}`)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [back, navigate])

  // iPhone has no Back button: a swipe from the left edge does the same
  useEffect(() => {
    if (!isIos(currentEnv())) return
    let start: { x: number; y: number } | null = null
    const onStart = (e: TouchEvent) => {
      const p = e.touches[0]
      start = e.touches.length === 1 ? { x: p.clientX, y: p.clientY } : null
    }
    const onEnd = (e: TouchEvent) => {
      const s = start
      start = null
      if (!s) return
      const p = e.changedTouches[0]
      if (isEdgeBackSwipe(s.x, p.clientX - s.x, p.clientY - s.y)) back(false)
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [back])

  if (!prompt) return null
  const exit = prompt.kind === 'exit'
  const yes = () => {
    close()
    if (prompt.kind === 'discard') return prompt.discard()
    // out of the app: past the spare step and the first one
    leaving.current = true
    window.history.back()
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <KeyScope
        focusOnMount
        onEscape={close}
        role="alertdialog"
        aria-modal
        aria-label={t(exit ? 'back.exitAsk' : 'back.discardAsk')}
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl outline-none dark:bg-slate-900"
      >
        <p className="mb-4 text-base font-semibold">
          {t(exit ? 'back.exitAsk' : 'back.discardAsk')}
        </p>
        <div className="flex gap-2">
          {exit ? (
            <>
              <Button className="flex-1" onClick={close}>
                {t('back.stay')}
              </Button>
              <Button className="flex-1" variant="soft" onClick={yes}>
                {t('back.leave')}
              </Button>
            </>
          ) : (
            <>
              <Button className="flex-1" variant="danger" onClick={yes}>
                {t('back.discard')}
              </Button>
              <Button className="flex-1" variant="soft" onClick={close}>
                {t('common.back')}
              </Button>
            </>
          )}
        </div>
      </KeyScope>
    </div>
  )
}
