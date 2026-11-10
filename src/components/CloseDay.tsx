import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Button, Card, Field, Input } from './ui'
import Sheet from './Sheet'
import {
  closeDay,
  CLOSE_XP,
  dayBeingClosed,
  isEvening,
  reviewDay,
  suggestedBed,
} from '../lib/closeDay'
import { celebrate } from '../lib/effects'
import { formatTimeOfDay } from '../lib/dates'
import { useT } from '../i18n'

const MOODS = ['😞', '😕', '😐', '🙂', '😄'] as const

/** "Close the day": three short steps in the evening (or whenever the button is pressed). */
export default function CloseDay({ now, today }: { now: Date; today: string }) {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const date = dayBeingClosed(data.settings, now, today)
  const closed = data.days[date]?.closed
  const evening = isEvening(data.settings, now)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [note, setNote] = useState('')
  const [main, setMain] = useState('')
  const [move, setMove] = useState<string[]>([])
  const [skip, setSkip] = useState<string[]>([])
  const [finished, setFinished] = useState(false)

  const review = reviewDay(data, date)
  const oneOff = review.open.filter((a) => a.recurrence === 'none')
  const toggle = (
    list: string[],
    set: (v: string[]) => void,
    other: string[],
    setOther: (v: string[]) => void,
    id: string,
  ) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
    setOther(other.filter((x) => x !== id))
  }

  function finish() {
    closeDay({ date, mood, note, moveIds: move, skipIds: skip, mainThing: main })
    setFinished(true)
    celebrate('close')
  }
  function reset() {
    setOpen(false)
    setStep(0)
    setMood(null)
    setNote('')
    setMain('')
    setMove([])
    setSkip([])
    setFinished(false)
  }

  if (closed && !open)
    return (
      <p className="mb-4 text-center text-sm text-slate-600 dark:text-slate-400">
        🌙 {t('close.closed')}
      </p>
    )
  if (!evening && !open)
    return (
      <div className="mb-4 text-center">
        <Button variant="ghost" onClick={() => setOpen(true)}>
          🌙 {t('close.button')}
        </Button>
      </div>
    )
  return (
    <>
      {!open && (
        <Card className="mb-4 border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950">
          <h2 className="font-semibold">🌙 {t('close.title')}</h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {t('close.intro', { n: CLOSE_XP })}
          </p>
          <Button className="mt-2" onClick={() => setOpen(true)}>
            {t('close.start')}
          </Button>
        </Card>
      )}
      <Sheet
        open={open}
        onClose={reset}
        title={t('close.title')}
        dirty={!finished && (!!note || !!main || mood !== null)}
      >
        {finished ? (
          <div className="space-y-3 py-4 text-center">
            <p className="anim-pop text-3xl" aria-hidden>
              🌙
            </p>
            <p className="font-semibold">{t('close.done')}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('close.bed', { time: formatTimeOfDay(suggestedBed(data.settings)) })}
            </p>
            <Button onClick={reset}>{t('common.close')}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('close.step', { n: step + 1 })}
            </p>
            {step === 0 && (
              <>
                <p className="text-sm">{t('close.review', { done: review.done, xp: review.xp })}</p>
                {oneOff.length > 0 && (
                  <ul className="space-y-2">
                    {oneOff.map((a) => (
                      <li key={a.id} className="space-y-1 text-sm">
                        <span className="user-text">{a.title}</span>
                        <span className="flex gap-2">
                          <Button
                            variant={move.includes(a.id) ? 'primary' : 'soft'}
                            aria-pressed={move.includes(a.id)}
                            onClick={() => toggle(move, setMove, skip, setSkip, a.id)}
                          >
                            {t('close.moveTomorrow')}
                          </Button>
                          <Button
                            variant={skip.includes(a.id) ? 'primary' : 'soft'}
                            aria-pressed={skip.includes(a.id)}
                            onClick={() => toggle(skip, setSkip, move, setMove, a.id)}
                          >
                            {t('close.skip')}
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <p className="text-sm">{t('close.mood')}</p>
                <div
                  className="flex justify-between gap-1"
                  role="radiogroup"
                  aria-label={t('close.mood')}
                >
                  {MOODS.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mood === i + 1}
                      aria-label={`${i + 1}/5`}
                      onClick={() => setMood((i + 1) as 1 | 2 | 3 | 4 | 5)}
                      className={`min-h-12 flex-1 rounded-xl text-2xl ${
                        mood === i + 1
                          ? 'bg-blue-100 ring-2 ring-blue-600 dark:bg-blue-950'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <Field label={t('close.note')} optional>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
              </>
            )}
            {step === 2 && (
              <Field label={t('close.main')} optional>
                <Input
                  value={main}
                  onChange={(e) => setMain(e.target.value)}
                  placeholder={t('close.mainHint')}
                />
              </Field>
            )}
            <div className="flex justify-between">
              <Button variant="soft" disabled={step === 0} onClick={() => setStep(step - 1)}>
                {t('common.back')}
              </Button>
              <Button onClick={() => (step < 2 ? setStep(step + 1) : finish())}>
                {step < 2 ? t('common.next') : t('close.finish')}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}
