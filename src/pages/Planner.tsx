import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store'
import { Button, Card, PageTitle } from '../components/ui'
import { CATEGORY_META } from '../types'
import { addDaysStr, formatLong, todayStr, weekdayOf } from '../lib/dates'
import { planWeek, type Adjustment } from '../lib/planner'

export default function Planner() {
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
  const today = todayStr()
  const suggested = activities
    .filter((a) => a.suggested)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))

  function generate() {
    // on Sunday plan the whole next week, otherwise the rest of this week
    const sunday = weekdayOf(today) === 7
    const from = sunday ? addDaysStr(today, 1) : today
    const result = planWeek({
      from,
      days: sunday ? 7 : undefined,
      settings,
      subjects,
      assessments,
      activities,
    })
    activities
      .filter((a) => a.suggested && a.source === 'me')
      .forEach((a) => remove('activities', a.id))
    result.suggestions.forEach((s) => add('activities', s))
    setNotes(result.notes)
    setAdjustments(result.adjustments)
  }
  function applyAdjustment(a: Adjustment) {
    update('activities', a.activityId, { end: a.newEnd })
    setAdjustments((list) => list.filter((x) => x !== a))
  }

  return (
    <>
      <PageTitle sub="Bez AI-ja: pravila za učenje, trening, odmor i igre. Predlozi imaju isprekidanu ivicu dok ih ne prihvatiš.">
        🧠 Planer
      </PageTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={generate}>Predloži plan</Button>
        {suggested.length > 0 && (
          <>
            <Button
              variant="soft"
              onClick={() =>
                suggested.forEach((a) => update('activities', a.id, { suggested: false }))
              }
            >
              Prihvati sve
            </Button>
            <Button
              variant="ghost"
              onClick={() => suggested.forEach((a) => remove('activities', a.id))}
            >
              Odbaci sve
            </Button>
          </>
        )}
      </div>

      {notes.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">Objašnjenje</h2>
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
            Skrati trening do {a.newEnd}
          </Button>
        </Card>
      ))}

      {suggested.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nema predloga. Klikni „Predloži plan".
          </p>
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
                {a.start}–{a.end}
              </span>
              <span>
                {CATEGORY_META[a.category].emoji} {a.title}
              </span>
              <span className="ml-auto flex gap-1">
                <Button
                  variant="soft"
                  onClick={() => update('activities', a.id, { suggested: false })}
                >
                  Prihvati
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => remove('activities', a.id)}
                  aria-label={`Odbaci ${a.title}`}
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
