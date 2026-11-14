import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, PageTitle } from '../components/ui'
import { cancelByKey } from '../lib/nativeNotify'
import { todayStr } from '../lib/dates'
import { useT } from '../i18n'

/** How long the button must be held to stop the alarm (a harder Stop than one tap). */
export const HOLD_MS = 3000

/** The wake-up alarm screen: hold the button for 3 seconds to stop it. */
export default function Alarm() {
  const { t } = useT()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const start = useRef<number | null>(null)
  const raf = useRef(0)

  const stop = async () => {
    setDone(true)
    await cancelByKey(`alarm-${todayStr()}`)
    setTimeout(() => navigate('/', { replace: true }), 1200)
  }
  const tick = () => {
    if (start.current === null) return
    const p = Math.min(1, (Date.now() - start.current) / HOLD_MS)
    setProgress(p)
    if (p >= 1) {
      start.current = null
      void stop()
    } else raf.current = requestAnimationFrame(tick)
  }
  const press = () => {
    if (done) return
    start.current = Date.now()
    raf.current = requestAnimationFrame(tick)
  }
  const release = () => {
    start.current = null
    cancelAnimationFrame(raf.current)
    if (!done) setProgress(0)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <>
      <PageTitle>{t('alarm.title')}</PageTitle>
      <Card className="space-y-4 text-center">
        <p className="text-sm">{done ? t('alarm.done') : t('alarm.body')}</p>
        {!done && (
          <button
            type="button"
            onPointerDown={press}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && press()}
            onKeyUp={release}
            className="relative min-h-16 w-full overflow-hidden rounded-2xl bg-red-700 px-4 py-4 text-lg font-bold text-white touch-none select-none"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-red-950/60"
              style={{ width: `${progress * 100}%` }}
            />
            <span className="relative">{progress > 0 ? t('alarm.holding') : t('alarm.hold')}</span>
          </button>
        )}
      </Card>
    </>
  )
}
