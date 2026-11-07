import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store'
import { Button, Card, PageTitle } from '../components/ui'
import { CATEGORY_META } from '../types'
import {
  addDaysStr,
  formatDayMonth,
  formatLong,
  formatTimeOfDay,
  formatWeekdayDayMonth,
  nowMinutes,
  todayStr,
  weekdayOf,
  weekStartStr,
} from '../lib/dates'
import { assessmentLabel } from '../lib/labels'
import { planWeek, type Adjustment } from '../lib/planner'
import { patchOccurrence } from '../lib/schedule'
import { useT } from '../i18n'

export default function Planner() {
  const { t } = useT()
  const { activities, subjects, assessments, settings, add, update, remove } = useStore(
    useShallow((s) => ({
      activities: s.activities,
      subjects: s.subjects,
      assessments: s.assessments,
      settings: s.settings,
      add: s.add,
      update: s.update,
      remove: s.remove,
    })),
  )
  const [notes, setNotes] = useState<string[]>([])
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  /** What the planner just said: it always answers, even when there is nothing to add. */
  const [answer, setAnswer] = useState<string[]>([])
  const today = todayStr()
  // on the weekend the sensible default is the coming week
  const [range, setRange] = useState<'this' | 'next'>(weekdayOf(today) >= 6 ? 'next' : 'this')
  const suggested = activities
    .filter((a) => a.suggested)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))

  function generate() {
    const next = range === 'next'
    const from = next ? addDaysStr(weekStartStr(today), 7) : today
    const days = next ? 7 : 7 - weekdayOf(today) + 1
    const result = planWeek({
      from,
      days,
      nowMin: next ? undefined : nowMinutes(),
      settings,
      subjects,
      assessments,
      activities,
    })
    // only the old suggestions of the planned days are replaced
    const last = addDaysStr(from, days - 1)
    activities
      .filter((a) => a.suggested && a.source === 'me' && a.date >= from && a.date <= last)
      .forEach((a) => remove('activities', a.id))
    result.suggestions.forEach((s) => add('activities', s))
    setNotes(result.notes)
    setAdjustments(result.adjustments)
    const lines = result.studyStarts.map((st) => {
      const subject = subjects.find((x) => x.id === st.subjectId)
      return t('pl.studyStarts', {
        subject: subject?.name ?? t('subject.fallback'),
        from: formatWeekdayDayMonth(st.from),
        kind: assessmentLabel(st.type).toLowerCase(),
        date: formatDayMonth(st.examDate),
      })
    })
    if (result.suggestions.length === 0) lines.unshift(t('pl.allDone'))
    else if (lines.length === 0) lines.push(t('pl.added', { n: result.suggestions.length }))
    setAnswer(lines)
  }
  function applyAdjustment(a: Adjustment) {
    const activity = activities.find((x) => x.id === a.activityId)
    if (activity) {
      const { updated, single } = patchOccurrence(activity, a.date, { end: a.newEnd })
      update('activities', updated.id, updated)
      if (single) add('activities', single)
    }
    setAdjustments((list) => list.filter((x) => x !== a))
  }

  return (
    <>
      <PageTitle sub={t('pl.sub')}>{t('pl.title')}</PageTitle>
      <div role="group" aria-label={t('pl.range')} className="mb-3 flex gap-2">
        {(['this', 'next'] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium transition ${
              range === r ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {t(r === 'this' ? 'pl.thisWeek' : 'pl.nextWeek')}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={generate}>{t('pl.generate')}</Button>
        {suggested.length > 0 && (
          <>
            <Button
              variant="soft"
              onClick={() =>
                suggested.forEach((a) => update('activities', a.id, { suggested: false }))
              }
            >
              {t('pl.acceptAll')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => suggested.forEach((a) => remove('activities', a.id))}
            >
              {t('pl.rejectAll')}
            </Button>
          </>
        )}
      </div>

      {answer.length > 0 && (
        <Card className="mb-4 border-blue-300 dark:border-blue-800">
          <ul role="status" className="space-y-1 text-sm font-medium">
            {answer.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>
      )}
      {notes.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">{t('pl.explain')}</h2>
          <ul className="space-y-1 text-sm">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Card>
      )}
      {adjustments.map((a) => (
        <Card key={a.activityId + a.date} className="mb-4 border-amber-300">
          <p className="text-sm">{a.reason}</p>
          <Button className="mt-2" variant="soft" onClick={() => applyAdjustment(a)}>
            {t('pl.shorten', { end: a.newEnd })}
          </Button>
        </Card>
      ))}

      {suggested.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('pl.none')}</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {suggested.map((a) => (
            <li
              key={a.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed p-3 text-sm ${CATEGORY_META[a.category].bg} ${CATEGORY_META[a.category].text}`}
              style={{ borderColor: CATEGORY_META[a.category].color }}
            >
              <span className="font-medium">{formatLong(a.date)}</span>
              <span>
                {formatTimeOfDay(a.start)}–{formatTimeOfDay(a.end)}
              </span>
              <span>
                {CATEGORY_META[a.category].emoji} {a.title}
              </span>
              <span className="ml-auto flex gap-1">
                <Button
                  variant="soft"
                  onClick={() => update('activities', a.id, { suggested: false })}
                >
                  {t('today.accept')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => remove('activities', a.id)}
                  aria-label={t('pl.reject', { title: a.title })}
                >
                  ✕
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
