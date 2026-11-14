import { greetingName } from '../lib/greetingName'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useStore, selectData } from '../store'
import { Badge, Button, Card, Field, Input } from '../components/ui'
import { CATEGORY_META } from '../types'
import {
  formatDuration,
  formatTimeOfDay,
  minToTime,
  timeToMin,
  addDaysStr,
  fromDateStr,
  todayStr,
} from '../lib/dates'
import {
  buildAlerts,
  currentAndNext,
  daySpan,
  inDayOrder,
  daySummary,
  occurrencesOn,
  withStatus,
  type Occurrence,
  withoutOccurrence,
} from '../lib/schedule'
import { parseQuick } from '../lib/quickParse'
import { applyParsed } from '../lib/apply'
import { setWorkoutDone } from '../lib/workoutFlow'
import { computeStreaks, rewardForDone, streakMessages } from '../lib/xp'
import { useToast } from '../lib/toast'
import ProgressCard from '../components/ProgressCard'
import ActivityForm from '../components/ActivityForm'
import ConfirmButton from '../components/ConfirmButton'
import Sheet from '../components/Sheet'
import DayPicker from '../components/DayPicker'
import CalendarButton from '../components/CalendarButton'
import MorningRoutine from '../components/MorningRoutine'
import DailyChallenge from '../components/DailyChallenge'
import WeekRing from '../components/WeekRing'
import CloseDay from '../components/CloseDay'
import { useSwipe } from '../lib/useSwipe'
import { useBackHandler } from '../lib/back'
import { deleteWithUndo } from '../lib/undo'
import { getLanguage, useT } from '../i18n'
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
  /** -1 = no "now" line (another day is on screen) */
  nowMin: number
}) {
  const { t } = useT()
  const w = timeToMin(wake)
  let b = timeToMin(bed)
  if (b <= w) b += 1440
  const height = ((b - w) / 60) * PX_PER_HOUR
  const y = (min: number) => ((Math.min(Math.max(min, w), b) - w) / 60) * PX_PER_HOUR
  const bounds = { wakeTime: wake, bedTime: bed }
  // after midnight, before bedtime: "now" is at the end of the day that is drawn
  const nowAt = nowMin >= 0 && nowMin < w && nowMin + 1440 <= b ? nowMin + 1440 : nowMin
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
          const span = daySpan(o, bounds)
          const top = y(span.start)
          const h = Math.max(y(span.end) - top, 18)
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
      {nowAt >= w && nowAt <= b && (
        <div
          className="absolute inset-x-0 z-10 border-t-2 border-red-500"
          style={{ top: y(nowAt) }}
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
  const [menu, setMenu] = useState<Occurrence | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const today = todayStr(now)
  // the day on screen: null follows the calendar (an app left open overnight moves to the new day)
  const [picked, setPicked] = useState<string | null>(null)
  const day = picked ?? today
  const isToday = day === today
  const pickDay = (d: string) => setPicked(d === today ? null : d)
  // "Back" on another day returns to today
  useBackHandler('tab', !isToday, () => setPicked(null))
  const swipe = useSwipe((dir) => pickDay(addDaysStr(day, dir === 'left' ? 1 : -1)))
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const bounds = useMemo(
    () => ({ wakeTime: data.settings.wakeTime, bedTime: data.settings.bedTime }),
    [data.settings.wakeTime, data.settings.bedTime],
  )
  const occ = useMemo(() => inDayOrder(occurrencesOn(data, day), bounds), [data, day, bounds])
  // what started yesterday and runs past midnight is still "now" in the small hours
  const lastNight = useMemo(() => occurrencesOn(data, addDaysStr(today, -1)), [data, today])
  const alerts = useMemo(() => buildAlerts(data, today), [data, today])
  const { current, next, minutesToNext } = currentAndNext(isToday ? occ : [], nowMin, {
    day: bounds,
    yesterday: lastNight,
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      setQuickError(t('today.quickEmpty'))
      return
    }
    setQuickError('')
    // typed while looking at another day: "učenje 2h" lands on that day, at the current time of day
    const base = new Date()
    if (!isToday) {
      const d = fromDateStr(day)
      base.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
    }
    setMsg(applyParsed(parseQuick(text, base), store))
    setText('')
  }

  function mark(o: Occurrence, status: 'done' | 'skipped' | 'planned') {
    const a = data.activities.find((x) => x.id === o.activityId)
    if (!a) return
    // a workout is one thing: marking it here also saves its exercises and pays XP once
    if (a.category === 'workout' && status !== 'skipped') {
      setWorkoutDone(a.id, day, status === 'done')
      const streaks = streakMessages(computeStreaks(selectData(useStore.getState()), today))
      if (status === 'done' && streaks.length)
        useToast.getState().push([...useToast.getState().messages, ...streaks])
      return
    }
    store.update('activities', a.id, withStatus(a, day, status))
    // anything but "done" takes back what "done" paid out
    if (status !== 'done') {
      store.revoke(`act-${a.id}-${day}`)
      return
    }
    const ev = rewardForDone(a, day, data.settings.rewardMinPerStudyHour)
    if (ev) store.award(ev)
    const streaks = streakMessages(computeStreaks(selectData(useStore.getState()), today))
    if (streaks.length) useToast.getState().push([...useToast.getState().messages, ...streaks])
  }
  function accept(o: Occurrence) {
    if (o.activityId) store.update('activities', o.activityId, { suggested: false })
  }

  const summary = daySummary(occ)
  const callName = greetingName(data.settings.name, getLanguage())
  const subtitle = callName
    ? `${callName}, ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`
    : summary

  return (
    <div {...swipe} className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="min-w-0">
        <div data-tour="today">
          <DayPicker day={day} today={today} onChange={pickDay} />
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>

        {isToday && data.days[today]?.mainThing && (
          <Card className="mb-4 border-blue-300 dark:border-blue-800" data-testid="main-thing">
            <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
              ⭐ {t('close.mainToday')}
            </p>
            <p className="user-text mt-1 font-medium">{data.days[today]?.mainThing}</p>
          </Card>
        )}

        {isToday && (
          <div data-tour="routine">
            <MorningRoutine now={now} today={today} />
          </div>
        )}
        {isToday && <DailyChallenge today={today} />}

        {isToday && now.getDay() === 0 && now.getHours() >= 18 && (
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

        {isToday && (
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
        )}

        {isToday && alerts.length > 0 && (
          <Card className="mb-4 border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <h2 className="mb-2 font-semibold text-red-800 dark:text-red-200">
              {t('today.alerts')}
            </h2>
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
            defaultDate={day}
            onClose={() => setEditing(null)}
          />
        )}

        <div data-tour="add tick">
          <Card className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">{t('today.duties')}</h2>
              <Button variant="soft" onClick={() => setEditing('new')}>
                {t('today.newActivity')}
              </Button>
            </div>
            {occ.length === 0 && (
              <p className="text-sm text-slate-500">
                {t(isToday ? 'today.empty' : 'today.emptyDay')}
              </p>
            )}
            <ul className="space-y-2">
              {occ.map((o) => (
                <li
                  key={o.key}
                  className="rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-24 shrink-0 tabular-nums">
                      {formatTimeOfDay(o.start)}–{formatTimeOfDay(o.end)}
                    </span>
                    <span className={o.status !== 'planned' ? 'line-through opacity-60' : ''}>
                      <span className="user-text">
                        {CATEGORY_META[o.category].emoji} {o.title}
                      </span>
                    </span>
                    {daySpan(o, bounds).start >= 1440 && (
                      <Badge className="bg-indigo-100 text-indigo-800">
                        {t('today.afterMidnight')}
                      </Badge>
                    )}
                    {o.suggested && (
                      <Badge className="bg-amber-100 text-amber-800">
                        {t('today.badge.suggested')}
                      </Badge>
                    )}
                    {o.status === 'done' && (
                      <Badge className="bg-green-100 text-green-800">{t('today.badge.done')}</Badge>
                    )}
                    {o.status === 'skipped' && (
                      <Badge className="bg-slate-200 text-slate-700">
                        {t('today.badge.skipped')}
                      </Badge>
                    )}
                  </div>
                  {o.type === 'activity' && o.activityId && (
                    <div className="mt-2 flex items-center gap-2">
                      {o.suggested ? (
                        <Button variant="soft" onClick={() => accept(o)}>
                          {t('today.accept')}
                        </Button>
                      ) : o.status === 'planned' ? (
                        <Button variant="soft" onClick={() => mark(o, 'done')}>
                          {t('today.markDone')}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          aria-label={t('today.undo', { title: o.title })}
                          onClick={() => mark(o, 'planned')}
                        >
                          {t('today.undoShort')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="ml-auto"
                        aria-haspopup="dialog"
                        aria-label={t('today.more', { title: o.title })}
                        onClick={() => setMenu(o)}
                      >
                        ⋯
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.title ?? ''}>
          {menu && (
            <div className="flex flex-col gap-2 pb-2">
              {menu.status === 'planned' && !menu.suggested && (
                <Button
                  variant="soft"
                  onClick={() => {
                    mark(menu, 'skipped')
                    setMenu(null)
                  }}
                >
                  {t('today.skip')}
                </Button>
              )}
              <Button
                variant="soft"
                aria-label={t('today.edit', { title: menu.title })}
                onClick={() => {
                  const a = data.activities.find((x) => x.id === menu.activityId)
                  setMenu(null)
                  if (a) setEditing(a)
                }}
              >
                ✎ {t('today.editShort')}
              </Button>
              {menu.recurring && (
                <Button
                  variant="soft"
                  aria-label={t('today.deleteOne', { title: menu.title })}
                  onClick={() => {
                    const a = data.activities.find((x) => x.id === menu.activityId)
                    if (a) store.update('activities', a.id, withoutOccurrence(a, menu.date))
                    setMenu(null)
                  }}
                >
                  {t(isToday ? 'today.onlyToday' : 'today.onlyThisDay')}
                </Button>
              )}
              <ConfirmButton
                ask={menu.recurring}
                label={t('today.delete', { title: menu.title })}
                onConfirm={() => {
                  const id = menu.activityId!
                  setMenu(null)
                  deleteWithUndo(() => store.remove('activities', id))
                }}
              >
                ✕ {t('today.deleteShort')}
              </ConfirmButton>
            </div>
          )}
        </Sheet>

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
      </div>
      <div className="min-w-0">
        <Card>
          <h2 className="mb-3 font-semibold">{t('today.timeline')}</h2>
          <Timeline
            occ={occ}
            wake={data.settings.wakeTime}
            bed={data.settings.bedTime}
            nowMin={isToday ? nowMin : -1}
          />
        </Card>

        {isToday && data.assessments.some((a) => a.date >= today) && (
          <Card className="mt-4">
            <h2 className="mb-2 font-semibold">{t('cal.todayTitle')}</h2>
            <CalendarButton compact />
          </Card>
        )}

        {isToday && (
          <div className="mt-4">
            <CloseDay now={now} today={today} />
          </div>
        )}

        <div className="mt-4">
          {isToday && <WeekRing today={today} />}
          <ProgressCard />
        </div>
      </div>
    </div>
  )
}
