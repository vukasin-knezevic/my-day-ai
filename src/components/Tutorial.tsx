import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Button, Card } from './ui'
import {
  TOUR_STEPS,
  addSampleSubject,
  addSampleTask,
  cleanUpTour,
  hasSampleSubject,
  hasSampleTask,
  sampleTaskDone,
  tickSampleTask,
  useTour,
} from '../lib/tour'
import { useT } from '../i18n'

/**
 * The guided tour. First a question ("Let's walk you through"), then one card per screen: the screen
 * is the real one, the card sits above the navigation and the part it talks about is outlined.
 */
export default function Tutorial() {
  const { t } = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const done = useStore((s) => s.settings.tutorialDone)
  const setSettings = useStore((s) => s.setSettings)
  const { started, step, start, go, stop } = useTour()
  // re-render when the sample things change (the "Next" button waits for them)
  const taskThere = useStore((s) => s.activities.some((a) => a.note === '__tour__'))
  const taskDone = useStore((s) =>
    s.activities.some((a) => a.note === '__tour__' && a.status === 'done'),
  )
  const subjectThere = useStore((s) =>
    s.subjects.some((x) => x.demo && x.name === t('tour.sampleSubject')),
  )

  const cur = TOUR_STEPS[step]
  useEffect(() => {
    if (started && cur && pathname !== cur.route) navigate(cur.route)
  }, [started, cur, pathname, navigate])

  // the part of the screen the card is about
  useEffect(() => {
    if (!started) return
    const el =
      document.querySelector(`[data-tour~="${cur.id}"]`) ??
      document.querySelector('[data-tour-page]')
    el?.classList.add('tour-hl')
    el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    return () => el?.classList.remove('tour-hl')
  }, [started, cur, pathname])

  const finish = () => {
    cleanUpTour()
    stop()
    setSettings({ tutorialDone: true })
  }

  if (!started) {
    if (done) return null
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('tour.askTitle')}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center"
      >
        <Card className="anim-pop w-full max-w-md space-y-3">
          <h2 className="text-lg font-bold">{t('tour.askTitle')}</h2>
          <p className="text-sm">{t('tour.askText')}</p>
          <div className="flex justify-between">
            <Button variant="soft" onClick={() => setSettings({ tutorialDone: true })}>
              {t('tour.skip')}
            </Button>
            <Button
              onClick={() => {
                cleanUpTour()
                start()
              }}
            >
              {t('tour.go')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const last = step === TOUR_STEPS.length - 1
  const waiting =
    (cur.action === 'addTask' && !taskThere) ||
    (cur.action === 'tickTask' && !taskDone) ||
    (cur.action === 'addSubject' && !subjectThere)
  return (
    <div
      role="dialog"
      aria-label={t('tour.title')}
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-md px-3 md:bottom-4"
    >
      <Card className="anim-pop space-y-2 border-amber-400 shadow-lg">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400" aria-live="polite">
          {t('tour.step', { n: step + 1, total: TOUR_STEPS.length })}
        </p>
        <h2 className="font-bold">{t(cur.title)}</h2>
        <p className="text-sm">{t(cur.text)}</p>
        {cur.action === 'addTask' && !taskThere && (
          <Button variant="soft" onClick={() => void addSampleTask()}>
            {t('tour.addSample')}
          </Button>
        )}
        {cur.action === 'tickTask' && hasSampleTask() && !sampleTaskDone() && (
          <Button variant="soft" onClick={tickSampleTask}>
            {t('tour.tickForMe')}
          </Button>
        )}
        {cur.action === 'addSubject' && !hasSampleSubject() && (
          <Button variant="soft" onClick={addSampleSubject}>
            {t('tour.addSubject')}
          </Button>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={finish}>
            {t('tour.skip')}
          </Button>
          <span className="flex gap-1" aria-hidden>
            {TOUR_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`size-2 rounded-full ${i === step ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              />
            ))}
          </span>
          <Button disabled={waiting} onClick={() => (last ? finish() : go(step + 1))}>
            {last ? t('tour.finish') : t('common.next')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
