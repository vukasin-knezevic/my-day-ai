import { addressName } from '../lib/address'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useStore, selectData } from '../store'
import { Badge, Button, Card, Field, Input } from '../components/ui'
import { CATEGORY_META } from '../types'
import {
  formatDuration,
  formatTimeOfDay,
  formatLong,
  minToTime,
  timeToMin,
  todayStr,
} from '../lib/dates'
import {
  buildAlerts,
  currentAndNext,
  daySummary,
  occurrencesOn,
  withStatus,
  type Occurrence,
  withoutOccurrence,
} from '../lib/schedule'
import { parseQuick } from '../lib/quickParse'
import { applyParsed } from '../lib/apply'
import { computeStreaks, rewardForDone, streakMessages } from '../lib/xp'
import { useToast } from '../lib/toast'
import ProgressCard from '../components/ProgressCard'
import ActivityForm from '../components/ActivityForm'
import { useT } from '../i18n'
import type { Activity } from '../types'

const PX_PER_HOUR = 44

function Timeline({
  occ,
  wake,
  bed,
  nowMin,
}: {
  occ: Occurrence[]
  wake: string
  bed: string
  nowMin: number
}) {
  const { t } = useT()
  const w = timeToMin(wake)
  let b = timeToMin(bed)
  if (b <= w) b += 1440
  const height = ((b - w) / 60) * PX_PER_HOUR
  const y = (min: number) => ((Math.min(Math.max(min, w), b) - w) / 60) * PX_PER_HOUR
  const hours: number[] = []
  for (let m = Math.ceil(w / 60) * 60; m <= b; m += 60) hours.push(m)
  return (
    <div className="relative ml-12" style={{ height }} aria-label={t('today.timelineAria')}>
      {hours.map((m) => (
        <div
          key={m}
          className="absolute inset-x-0 border-t border-slate-200 dark:border-slate-800"
          style={{ top: y(m) }}
        >
          <span className="absolute -left-12 -top-2 w-10 text-right text-xs text-slate-500">
            {minToTime(m)}
          </span>
        </div>
      ))}
      {occ
        .filter((o) => o.status !== 'skipped')
        .map((o) => {
          const top = y(timeToMin(o.start))
          const h = Math.max(y(timeToMin(o.end)) - top, 18)
          const meta = CATEGORY_META[o.category]
          return (
            <div
              key={o.key}
              className={`absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-2 py-0.5 text-xs ${meta.bg} ${meta.text} ${
                o.suggested ? 'border-2 border-dashed' : ''
              } ${o.status === 'done' ? 'opacity-60 line-through' : ''}`}
              style={{ top, height: h, borderLeftColor: o.color ?? meta.color }}
            >
              {meta.emoji} {o.title}
            </div>
          )
        })}
      {nowMin >= w && nowMin <= b && (
        <div
          className="absolute inset-x-0 z-10 border-t-2 border-red-500"
          style={{ top: y(nowMin) }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export default function Today() {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const store = useStore()
  const [now, setNow] = useState(new Date())
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [quickError, setQuickError] = useState('')
  const [editing, setEditing] = useState<Activity | 'new' | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const today = todayStr(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const occ = useMemo(() => occurrencesOn(data, today), [data, today])
  const alerts = useMemo(() => buildAlerts(data, today), [data, today])
  const { current, next, minutesToNext } = currentAndNext(occ, nowMin)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      setQuickError(t('today.quickEmpty'))
      return
    }
    setQuickError('')
    setMsg(applyParsed(parseQuick(text, new Date()), store))
    setText('')
  }

  function mark(o: Occurrence, status: 'done' | 'skipped' | 'planned') {
    const a = data.activities.find((x) => x.id === o.activityId)
    if (!a) return
    store.update('activities', a.id, withStatus(a, today, status))
    // anything but "done" takes back what "done" paid out
    if (status !== 'done') {
      store.revoke(`act-${a.id}-${today}`)
      return
    }
    const ev = rewardForDone(a, today, data.settings.rewardMinPerStudyHour)
    if (ev) store.award(ev)
    const streaks = streakMessages(computeStreaks(selectData(useStore.getState()), today))
    if (streaks.length) useToast.getState().push([...useToast.getState().messages, ...streaks])
  }
  function accept(o: Occurrence) {
    if (o.activityId) store.update('activities', o.activityId, { suggested: false })
  }

  const summary = daySummary(occ)
  const callName = addressName(data.settings)
  const subtitle = callName
    ? `${callName}, ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`
    : summary

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">🌅 {formatLong(today)}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
      </header>

      {now.getDay() === 0 && now.getHours() >= 18 && (
        <Card className="mb-4">
          <p className="text-sm">
            {t('today.sunday')}{' '}
            <Link
              to="/ai?k=rezime"
              className="font-medium text-blue-700 underline dark:text-blue-300"
            >
              {t('today.makeSummary')}
            </Link>
          </p>
        </Card>
      )}

      <section aria-label={t('today.nowNext')} className="mb-4 space-y-2">
        <Card className="border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-xs font-semibold tracking-wide text-blue-800 uppercase dark:text-blue-200">
            {t('today.nowLabel')}
          </p>
          {current ? (
            <>
              <p className="user-text mt-1 text-xl font-bold">
                {CATEGORY_META[current.category].emoji} {current.title}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t('today.until', { end: formatTimeOfDay(current.end) })}
              </p>
            </>
          ) : (
            <p className="mt-1 text-slate-700 dark:text-slate-300">{t('today.nothing')}</p>
          )}
        </Card>
        {next && (
          <div className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-800">
            <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
              {t('today.nextLabel')}
            </span>
            <p className="user-text">
              {CATEGORY_META[next.category].emoji} {next.title} · {formatTimeOfDay(next.start)}{' '}
              <span className="text-slate-600 dark:text-slate-400">
                ({t('today.in', { d: formatDuration(minutesToNext!) })})
              </span>
            </p>
          </div>
        )}
      </section>

      {alerts.length > 0 && (
        <Card className="mb-4 border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <h2 className="mb-2 font-semibold text-red-800 dark:text-red-200">{t('today.alerts')}</h2>
          <ul className="space-y-1 text-sm">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={a.level === 'red' ? 'font-medium text-red-800 dark:text-red-200' : ''}
              >
                {a.text}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && (
        <ActivityForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          defaultDate={today}
          onClose={() => setEditing(null)}
        />
      )}

      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{t('today.duties')}</h2>
          <Button variant="soft" onClick={() => setEditing('new')}>
            {t('today.newActivity')}
          </Button>
        </div>
        {occ.length === 0 && <p className="text-sm text-slate-500">{t('today.empty')}</p>}
        <ul className="space-y-2">
          {occ.map((o) => (
            <li key={o.key} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-24 shrink-0 tabular-nums">
                {formatTimeOfDay(o.start)}–{formatTimeOfDay(o.end)}
              </span>
              <span className={o.status !== 'planned' ? 'line-through opacity-60' : ''}>
                <span className="user-text">
                  {CATEGORY_META[o.category].emoji} {o.title}
                </span>
              </span>
              {o.suggested && (
                <Badge className="bg-amber-100 text-amber-800">{t('today.badge.suggested')}</Badge>
              )}
              {o.status === 'done' && (
                <Badge className="bg-green-100 text-green-800">{t('today.badge.done')}</Badge>
              )}
              {o.status === 'skipped' && (
                <Badge className="bg-slate-200 text-slate-700">{t('today.badge.skipped')}</Badge>
              )}
              {o.type === 'activity' && o.suggested && (
                <Button variant="soft" onClick={() => accept(o)}>
                  {t('today.accept')}
                </Button>
              )}
              {o.type === 'activity' && !o.suggested && o.status === 'planned' && (
                <span className="ml-auto flex gap-1">
                  <Button variant="soft" onClick={() => mark(o, 'done')}>
                    {t('today.markDone')}
                  </Button>
                  <Button variant="ghost" onClick={() => mark(o, 'skipped')}>
                    {t('today.skip')}
                  </Button>
                </span>
              )}
              {o.type === 'activity' && o.activityId && o.status !== 'planned' && (
                <Button
                  variant="ghost"
                  aria-label={t('today.undo', { title: o.title })}
                  onClick={() => mark(o, 'planned')}
                >
                  {t('today.undoShort')}
                </Button>
              )}
              {o.type === 'activity' && o.activityId && (
                <Button
                  variant="ghost"
                  aria-label={t('today.edit', { title: o.title })}
                  onClick={() => {
                    const a = data.activities.find((x) => x.id === o.activityId)
                    if (a) setEditing(a)
                  }}
                >
                  ✎
                </Button>
              )}
              {o.type === 'activity' && o.activityId && (
                <Button
                  variant="ghost"
                  aria-label={t('today.delete', { title: o.title })}
                  onClick={() => store.remove('activities', o.activityId!)}
                >
                  ✕
                </Button>
              )}
              {o.type === 'activity' && o.activityId && o.recurring && (
                <Button
                  variant="ghost"
                  aria-label={t('today.deleteOne', { title: o.title })}
                  onClick={() => {
                    const a = data.activities.find((x) => x.id === o.activityId)
                    if (a) store.update('activities', a.id, withoutOccurrence(a, o.date))
                  }}
                >
                  {t('today.onlyToday')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-4">
        <form onSubmit={submit} role="search" className="space-y-2">
          <Field label={t('today.quick')} error={quickError}>
            <div className="flex gap-2">
              <Input
                id="quick-input"
                placeholder={t('today.quickPlaceholder')}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setQuickError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setText('')
                }}
              />
              <Button type="submit">{t('common.add')}</Button>
            </div>
          </Field>
        </form>
        {msg && (
          <p role="status" className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            {msg}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t('today.timeline')}</h2>
        <Timeline
          occ={occ}
          wake={data.settings.wakeTime}
          bed={data.settings.bedTime}
          nowMin={nowMin}
        />
      </Card>

      <div className="mt-4">
        <ProgressCard />
      </div>
    </>
  )
}
