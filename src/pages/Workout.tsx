import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { selectData, useStore } from '../store'
import { tooltipProps } from '../components/chart'
import { Button, Card, Field, Input, PageTitle, Select, Tabs } from '../components/ui'
import { DateField } from '../components/Pickers'
import NumberInput from '../components/NumberInput'
import Sheet from '../components/Sheet'
import type { Weekday, Workout as WorkoutT, WorkoutExercise, WorkoutPlan } from '../types'
import {
  addDaysStr,
  durationMin,
  formatDuration,
  formatShort,
  formatTimeOfDay,
  minToTime,
  nowMinutes,
  todayStr,
  weekdayName,
  weekStartStr,
} from '../lib/dates'
import {
  estimateMinutes,
  exerciseHistory,
  exerciseNames,
  getSplits,
  logged,
  proteinOn,
  totalVolume,
  workoutsDoneInWeek,
} from '../lib/workout'
import { occurrencesOn, type Occurrence } from '../lib/schedule'
import {
  activatePlan,
  finishWorkout,
  logFor,
  planConflicts,
  removeWorkoutLog,
  scheduleWorkout,
  setWorkoutDone,
  stopPlan,
} from '../lib/workoutFlow'
import { deleteWithUndo } from '../lib/undo'
import { useT } from '../i18n'
import { useToday } from '../lib/useToday'
import Rich from '../i18n/Rich'

type Tab = 'trening' | 'plan' | 'ishrana'

export default function Workout() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('trening')
  const tabs: [Tab, string][] = [
    ['trening', t('wo.tab.training')],
    ['plan', t('wo.tab.plan')],
    ['ishrana', t('wo.tab.food')],
  ]
  return (
    <>
      <PageTitle>{t('wo.title')}</PageTitle>
      <Tabs tabs={tabs} active={tab} activeClass="bg-orange-700" onChange={setTab} />
      {tab === 'trening' && <Training />}
      {tab === 'plan' && <Plan />}
      {tab === 'ishrana' && <Food />}
    </>
  )
}

interface Row {
  name: string
  sets: number
  reps: number
  weight: number
}
const emptyRow = (): Row => ({ name: '', sets: 3, reps: 8, weight: 0 })

const rowsFromExercises = (ex: WorkoutExercise[]): Row[] =>
  ex.map((e) => ({
    name: e.name,
    sets: e.sets.length,
    reps: e.sets[0]?.reps ?? 8,
    weight: Math.max(0, ...e.sets.map((s) => s.weight)),
  }))

function rowsToExercises(rows: Row[]): WorkoutExercise[] {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => ({
      name: r.name.trim(),
      sets: Array.from({ length: Math.max(1, r.sets) }, () => ({
        reps: r.reps,
        weight: r.weight,
      })),
    }))
}

/** The exercise rows (shared by "new workout" and "done"): visible labels, suggestions from the app itself. */
function ExerciseRows({
  rows,
  setRows,
  names,
}: {
  rows: Row[]
  setRows: (f: (r: Row[]) => Row[]) => void
  names: string[]
}) {
  const { t } = useT()
  const [removed, setRemoved] = useState<{ row: Row; index: number } | null>(null)
  const [focus, setFocus] = useState<number | null>(null)
  const setRow = (i: number, p: Partial<Row>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const suggestions = (typed: string) => {
    const q = typed.trim().toLowerCase()
    if (!q) return []
    return names.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 4)
  }
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                aria-label={t('wo.exerciseAria', { n: i + 1 })}
                placeholder={t('wo.exercisePlaceholder')}
                value={r.name}
                onFocus={() => setFocus(i)}
                onChange={(e) => setRow(i, { name: e.target.value })}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setRemoved({ row: r, index: i })
                setRows((x) => x.filter((_, j) => j !== i))
              }}
              aria-label={t('wo.removeExercise', { n: i + 1 })}
            >
              ✕
            </Button>
          </div>
          {focus === i && suggestions(r.name).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {suggestions(r.name).map((n) => (
                <Button
                  key={n}
                  variant="soft"
                  className="!min-h-8 !px-2 !py-1 text-xs"
                  onClick={() => setRow(i, { name: n })}
                >
                  {n}
                </Button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Field label={t('wo.lbl.sets')}>
              <NumberInput
                aria-label={t('wo.setsAria', { n: i + 1 })}
                min={1}
                max={50}
                value={r.sets}
                onChange={(v) => setRow(i, { sets: v })}
              />
            </Field>
            <Field label={t('wo.lbl.reps')}>
              <NumberInput
                aria-label={t('wo.repsAria', { n: i + 1 })}
                min={1}
                max={500}
                value={r.reps}
                onChange={(v) => setRow(i, { reps: v })}
              />
            </Field>
            <Field label={t('wo.lbl.kg')}>
              <NumberInput
                aria-label={t('wo.weightAria', { n: i + 1 })}
                min={0}
                max={1000}
                step={0.5}
                value={r.weight}
                onChange={(v) => setRow(i, { weight: v })}
              />
            </Field>
          </div>
        </div>
      ))}
      {removed && (
        <p className="flex items-center gap-2 text-sm" role="status">
          {t('undo.deleted')}
          <Button
            variant="ghost"
            onClick={() => {
              setRows((r) => {
                const next = [...r]
                next.splice(Math.min(removed.index, next.length), 0, removed.row)
                return next
              })
              setRemoved(null)
            }}
          >
            {t('common.undo')}
          </Button>
        </p>
      )}
      <Button
        variant="primary"
        className="w-full"
        onClick={() => setRows((r) => [...r, emptyRow()])}
      >
        {t('wo.addExerciseBig')}
      </Button>
    </div>
  )
}

/** A rounded time, an hour ahead: a sensible start for a new workout. */
const defaultStart = () => minToTime(Math.min(21 * 60, Math.ceil((nowMinutes() + 30) / 30) * 30))

function Training() {
  const { t } = useT()
  const { workouts, templates, settings, add, remove, update } = useStore(
    useShallow((s) => ({
      workouts: s.workouts,
      templates: s.workoutTemplates,
      settings: s.settings,
      add: s.add,
      remove: s.remove,
      update: s.update,
    })),
  )
  const data = useStore(useShallow((s) => selectData(s)))
  const today = useToday()
  const [adding, setAdding] = useState(false)
  const [finishing, setFinishing] = useState<Occurrence | null>(null)
  const [msg, setMsg] = useState('')
  const [chartEx, setChartEx] = useState('')
  const history = logged(workouts)
  const names = exerciseNames(history)
  const chosen = chartEx || names[0] || ''
  const chart = chosen ? exerciseHistory(history, chosen) : []
  const weekCount = workoutsDoneInWeek(data, today)

  // this week and next 7 days of scheduled workouts
  const from = weekStartStr(today)
  const upcoming = Array.from({ length: 15 }, (_, i) => addDaysStr(from, i)).flatMap((d) =>
    occurrencesOn(data, d).filter((o) => o.category === 'workout' && o.type === 'activity'),
  )

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm">
          <Rich
            text={t('wo.thisWeek', {
              n: weekCount,
              goal: settings.workoutsPerWeek,
            })}
          />
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={weekCount}
          aria-valuemax={settings.workoutsPerWeek}
          aria-label={t('wo.weekAria')}
        >
          <div
            className="h-full bg-orange-500"
            style={{
              width: `${Math.min(100, (weekCount / Math.max(1, settings.workoutsPerWeek)) * 100)}%`,
            }}
          />
        </div>
      </Card>

      {msg && (
        <p
          role="status"
          className="rounded-xl bg-orange-100 p-3 text-sm font-medium text-orange-900"
        >
          {msg}
        </p>
      )}

      <Button className="w-full" onClick={() => setAdding(true)}>
        {t('wo.add')}
      </Button>

      <Card>
        <h2 className="mb-2 font-semibold">{t('wo.upcoming')}</h2>
        {upcoming.length === 0 && <p className="text-sm text-slate-500">{t('wo.noUpcoming')}</p>}
        <ul className="space-y-2 text-sm">
          {upcoming.map((o) => {
            const log = o.activityId ? logFor(workouts, o.activityId, o.date) : undefined
            const done = o.status === 'done'
            return (
              <li key={o.key} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1">
                  <strong>{o.title}</strong> · {formatShort(o.date)} {formatTimeOfDay(o.start)}
                  {log && log.exercises.length > 0 && (
                    <> · {t('wo.exercises', { n: log.exercises.length })}</>
                  )}
                </span>
                {done ? (
                  <>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {t('wo.doneBadge')}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => o.activityId && setWorkoutDone(o.activityId, o.date, false)}
                    >
                      {t('wo.undoDone')}
                    </Button>
                  </>
                ) : (
                  <Button variant="soft" onClick={() => setFinishing(o)}>
                    {t('wo.markDone')}
                  </Button>
                )}
                {!o.recurring && o.activityId && (
                  <Button
                    variant="ghost"
                    aria-label={t('wo.deleteScheduled', { title: o.title })}
                    onClick={() =>
                      deleteWithUndo(() => {
                        if (log) remove('workouts', log.id)
                        remove('activities', o.activityId!)
                        useStore.getState().revoke(`act-${o.activityId}-${o.date}`)
                      })
                    }
                  >
                    ✕
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      {names.length > 0 && (
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold">{t('wo.progressTitle')}</h2>
            <Select
              aria-label={t('wo.chartAria')}
              className="!w-auto"
              value={chosen}
              onChange={(e) => setChartEx(e.target.value)}
            >
              {names.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={formatShort} fontSize={11} />
                <YAxis unit=" kg" fontSize={11} width={55} />
                <Tooltip {...tooltipProps} />
                <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">{t('wo.history')}</h2>
        {history.length === 0 && <p className="text-sm text-slate-500">{t('wo.noHistory')}</p>}
        <ul className="space-y-2 text-sm">
          {[...history]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-2">
                <span>
                  <Rich
                    text={t('wo.historyLine', {
                      date: formatShort(w.date),
                      type: w.type,
                      dur: formatDuration(w.durationMin),
                      f: w.feeling ?? '–',
                      exercises: t('wo.exercises', { n: w.exercises.length }),
                      vol: totalVolume(w),
                    })}
                  />
                </span>
                <Button
                  variant="ghost"
                  onClick={() => deleteWithUndo(() => removeWorkoutLog(w.id))}
                  aria-label={t('wo.deleteWorkout', { date: w.date })}
                >
                  {t('common.delete')}
                </Button>
              </li>
            ))}
        </ul>
      </Card>

      {adding && (
        <AddWorkoutSheet
          templates={templates}
          names={names}
          last={[...history].sort((a, b) => b.date.localeCompare(a.date))[0]}
          onClose={() => setAdding(false)}
          onSaved={(m) => {
            setMsg(m)
            setAdding(false)
          }}
          addTemplate={(tpl) => add('workoutTemplates', tpl)}
          removeTemplate={(id) => remove('workoutTemplates', id)}
          renameTemplate={(id, name) => update('workoutTemplates', id, { name })}
        />
      )}
      {finishing && (
        <FinishSheet
          occ={finishing}
          names={names}
          onClose={() => setFinishing(null)}
          onSaved={(m) => {
            setMsg(m)
            setFinishing(null)
          }}
        />
      )}
    </div>
  )
}

function AddWorkoutSheet({
  templates,
  names,
  last,
  onClose,
  onSaved,
  addTemplate,
  removeTemplate,
  renameTemplate,
}: {
  templates: { id: string; name: string; type: string; exercises: Row[] }[]
  names: string[]
  last: WorkoutT | undefined
  onClose: () => void
  onSaved: (msg: string) => void
  addTemplate: (tpl: { name: string; type: string; exercises: Row[] }) => string
  removeTemplate: (id: string) => void
  renameTemplate: (id: string, name: string) => void
}) {
  const { t } = useT()
  const [name, setName] = useState('')
  const [date, setDate] = useState(todayStr())
  const [start, setStart] = useState(defaultStart())
  const [rows, setRows] = useState<Row[]>([])
  const [tplId, setTplId] = useState('')
  const [note, setNote] = useState('')
  const dirty = name !== '' || rows.length > 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !start) return
    scheduleWorkout({
      title: name,
      date,
      start,
      exercises: rowsToExercises(rows),
    })
    onSaved(
      t('wo.scheduled', {
        when: `${formatShort(date)} ${formatTimeOfDay(start)}`,
      }),
    )
  }
  function saveTemplate() {
    const exercises = rows.filter((r) => r.name.trim()).map((r) => ({ ...r, name: r.name.trim() }))
    if (exercises.length === 0) return setNote(t('wo.tplNeedsExercise'))
    const tplName = name.trim() || t('wo.tplDefaultName')
    const existing = templates.find((x) => x.name.toLowerCase() === tplName.toLowerCase())
    if (existing) removeTemplate(existing.id)
    setTplId(addTemplate({ name: tplName, type: tplName, exercises }))
    setNote(t('wo.tplSaved', { name: tplName }))
  }

  return (
    <Sheet open dirty={dirty} onClose={onClose} title={t('wo.new')}>
      <form onSubmit={submit} className="space-y-3 pb-2">
        <Field label={t('wo.f.name')} optional>
          <Input
            value={name}
            placeholder={t('plan.workoutTitle')}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('wo.f.day')} required>
            <DateField value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('wo.f.time')} required>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
        </div>
        {(templates.length > 0 || last) && (
          <div className="flex flex-wrap items-end gap-2">
            {templates.length > 0 && (
              <div className="min-w-40 flex-1">
                <Field label={t('wo.templates')}>
                  <Select
                    value={tplId}
                    onChange={(e) => {
                      setTplId(e.target.value)
                      const tpl = templates.find((x) => x.id === e.target.value)
                      if (!tpl) return
                      setName(tpl.type)
                      setRows(tpl.exercises.map((x) => ({ ...x })))
                    }}
                  >
                    <option value="">{t('wo.pickTemplate')}</option>
                    {templates.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} ({x.exercises.length})
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            {tplId && (
              <>
                <Button
                  variant="ghost"
                  aria-label={t('wo.deleteTemplateAria')}
                  onClick={() => {
                    deleteWithUndo(() => removeTemplate(tplId))
                    setTplId('')
                  }}
                >
                  {t('wo.deleteTemplate')}
                </Button>
                <Button
                  variant="ghost"
                  disabled={!name.trim()}
                  onClick={() => {
                    renameTemplate(tplId, name.trim())
                    setNote(t('wo.tplRenamed', { name: name.trim() }))
                  }}
                >
                  {t('wo.renameTemplate')}
                </Button>
              </>
            )}
            {last && (
              <Button
                variant="ghost"
                onClick={() => {
                  setName(last.type)
                  setRows(rowsFromExercises(last.exercises))
                }}
              >
                {t('wo.repeat')}
              </Button>
            )}
          </div>
        )}
        <ExerciseRows rows={rows} setRows={setRows} names={names} />
        {rows.length > 0 && <p className="text-xs text-slate-500">{t('wo.fieldsHelp')}</p>}
        {note && (
          <p role="status" className="text-sm">
            {note}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="flex-1">
            {t('wo.scheduleBtn')}
          </Button>
          <Button variant="soft" onClick={saveTemplate}>
            {t('wo.saveTemplate')}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

function FinishSheet({
  occ,
  names,
  onClose,
  onSaved,
}: {
  occ: Occurrence
  names: string[]
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const { t } = useT()
  const st = useStore.getState()
  const activity = st.activities.find((a) => a.id === occ.activityId)
  const log = occ.activityId ? logFor(st.workouts, occ.activityId, occ.date) : undefined
  // the exercises planned for this workout, or those of the plan day it repeats
  const planDay = activity?.planDay
    ? st.workoutPlan?.days.find((d) => d.day === activity.planDay)
    : undefined
  const [rows, setRows] = useState<Row[]>(() =>
    log
      ? rowsFromExercises(log.exercises)
      : (planDay?.exercises ?? []).map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: parseInt(e.reps, 10) || 8,
          weight: 0,
        })),
  )
  const [minutes, setMinutes] = useState(() =>
    log && !log.planned
      ? log.durationMin
      : rows.length
        ? estimateMinutes(rowsToExercises(rows).map((e) => ({ sets: e.sets })))
        : Math.max(5, durationMin(occ.start, occ.end)),
  )
  const [feeling, setFeeling] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!occ.activityId) return
    const { records } = finishWorkout({
      activityId: occ.activityId,
      date: occ.date,
      exercises: rowsToExercises(rows),
      durationMin: minutes,
      feeling: feeling ? (Number(feeling) as WorkoutT['feeling']) : undefined,
    })
    onSaved(
      records.length
        ? t('wo.record', {
            list: records
              .map((r) =>
                t('wo.recordItem', {
                  name: r.name,
                  kg: r.weight,
                  before: r.before,
                }),
              )
              .join(', '),
          })
        : t('wo.saved'),
    )
  }

  return (
    <Sheet open onClose={onClose} title={`${t('wo.finishTitle')} · ${occ.title}`}>
      <form onSubmit={submit} className="space-y-3 pb-2">
        <ExerciseRows rows={rows} setRows={setRows} names={names} />
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('wo.finishDuration')}>
            <NumberInput min={1} max={600} value={minutes} onChange={setMinutes} />
          </Field>
          <Field label={t('wo.finishFeeling')} optional>
            <Select value={feeling} onChange={(e) => setFeeling(e.target.value)}>
              <option value="">–</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}/5
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button type="submit" className="w-full">
          {t('wo.finishSave')}
        </Button>
      </form>
    </Sheet>
  )
}

function Plan() {
  const { t } = useT()
  const active = useStore((s) => s.workoutPlan)
  const splits = getSplits()
  const [viewIdx, setViewIdx] = useState<number | null>(null)
  const [when, setWhen] = useState(false)
  const [msg, setMsg] = useState('')
  const view: WorkoutPlan | undefined = viewIdx !== null ? splits[viewIdx] : (active ?? undefined)
  const isActive = !!view && !!active?.schedule && active.name === view.name
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 font-semibold">{t('wo.splits')}</h2>
        <div className="flex flex-wrap gap-2">
          {splits.map((s, i) => (
            <Button
              key={s.name}
              variant={view?.name === s.name ? 'primary' : 'soft'}
              onClick={() => setViewIdx(i)}
            >
              {s.name}
              {active?.schedule && active.name === s.name ? ' ✓' : ''}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('wo.splitsNote')}</p>
      </Card>
      {msg && (
        <p
          role="status"
          className="rounded-xl bg-orange-100 p-3 text-sm font-medium text-orange-900"
        >
          {msg}
        </p>
      )}
      {view ? (
        <>
          <PlanView plan={view} schedule={isActive ? active?.schedule : undefined} />
          <div className="flex flex-wrap items-center gap-2">
            {isActive ? (
              <>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {t('wo.planActive')}
                </span>
                <Button variant="soft" onClick={() => setWhen(true)}>
                  {t('wo.changeTime')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    stopPlan()
                    setMsg(t('wo.planStopped'))
                  }}
                >
                  {t('wo.stopPlan')}
                </Button>
              </>
            ) : (
              <Button onClick={() => setWhen(true)}>{t('wo.usePlan')}</Button>
            )}
          </div>
          {when && (
            <PlanWhenSheet
              plan={view}
              initial={isActive ? active?.schedule : undefined}
              onClose={() => setWhen(false)}
              onStart={(slots) => {
                activatePlan(view, slots)
                setWhen(false)
                setViewIdx(null)
                setMsg(t('wo.planStarted'))
              }}
            />
          )}
        </>
      ) : (
        <Card className="text-sm">{t('wo.pickSplit')}</Card>
      )}
    </div>
  )
}

function PlanWhenSheet({
  plan,
  initial,
  onClose,
  onStart,
}: {
  plan: WorkoutPlan
  initial: { day: Weekday; start: string }[] | undefined
  onClose: () => void
  onStart: (slots: { day: Weekday; start: string }[]) => void
}) {
  const { t } = useT()
  const [slots, setSlots] = useState(() =>
    plan.days.map((d, i) => initial?.[i] ?? { day: d.day, start: '18:00' }),
  )
  const set = (i: number, p: Partial<{ day: Weekday; start: string }>) =>
    setSlots((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)))
  return (
    <Sheet open onClose={onClose} title={t('wo.whenTitle')}>
      <div className="space-y-3 pb-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('wo.whenNote')}</p>
        {plan.days.map((d, i) => {
          const conflicts = planConflicts(
            slots[i].day,
            slots[i].start,
            estimateMinutes(d.exercises),
          )
          return (
            <div key={i} className="space-y-1 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="text-sm font-medium">{d.title}</p>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  aria-label={t('wo.f.day')}
                  value={slots[i].day}
                  onChange={(e) => set(i, { day: Number(e.target.value) as Weekday })}
                >
                  {([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((w) => (
                    <option key={w} value={w}>
                      {weekdayName(w)}
                    </option>
                  ))}
                </Select>
                <Input
                  type="time"
                  aria-label={t('wo.f.time')}
                  value={slots[i].start}
                  onChange={(e) => set(i, { start: e.target.value })}
                />
              </div>
              {conflicts.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t('wo.conflict', { names: conflicts.join(', ') })}
                </p>
              )}
            </div>
          )
        })}
        <Button className="w-full" onClick={() => onStart(slots)}>
          {t('wo.startPlan')}
        </Button>
      </div>
    </Sheet>
  )
}

function PlanView({
  plan,
  schedule,
}: {
  plan: WorkoutPlan
  schedule: { day: Weekday; start: string }[] | undefined
}) {
  const { t } = useT()
  return (
    <Card>
      <h2 className="mb-2 font-semibold">
        {plan.name}{' '}
        <span className="text-xs text-slate-500">
          ({plan.source === 'ai' ? t('wo.sourceAi') : t('wo.sourceTemplate')})
        </span>
      </h2>
      <ul className="space-y-3 text-sm">
        {plan.days.map((d, i) => (
          <li key={d.day + d.title + i}>
            <strong>
              {t('wo.planDay', {
                day: weekdayName(schedule?.[i]?.day ?? d.day),
                title: d.title,
              })}
              {schedule?.[i] ? ` · ${formatTimeOfDay(schedule[i].start)}` : ''}
            </strong>
            <ul className="ml-4 list-disc">
              {d.exercises.map((e) => (
                <li key={e.name}>{t('wo.exLine', { name: e.name, sets: e.sets, reps: e.reps })}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  )
}
function Food() {
  const { t } = useT()
  const { meals, goal, add, remove } = useStore(
    useShallow((s) => ({
      meals: s.meals,
      goal: s.settings.proteinGoal,
      add: s.add,
      remove: s.remove,
    })),
  )
  const today = useToday()
  const [desc, setDesc] = useState('')
  const [descError, setDescError] = useState('')
  const [protein, setProtein] = useState(30)
  const total = proteinOn(meals, today)
  const pct = Math.min(100, (total / Math.max(1, goal)) * 100)
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim()) {
      setDescError(t('common.required'))
      return
    }
    setDescError('')
    add('meals', { date: today, description: desc.trim(), protein })
    setDesc('')
  }
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm">
          <Rich text={t('wo.proteinToday', { n: total, goal })} />
        </p>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={total}
          aria-valuemax={goal}
          aria-label={t('wo.proteinAria')}
        >
          <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
        </div>
        {total >= goal && <p className="mt-1 text-sm">{t('wo.proteinDone')}</p>}
      </Card>
      <Card>
        <form onSubmit={submit} className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Field label={t('wo.meal')} required error={descError}>
              <Input
                value={desc}
                onChange={(e) => {
                  setDesc(e.target.value)
                  setDescError('')
                }}
                placeholder={t('wo.mealPlaceholder')}
              />
            </Field>
          </div>
          <Field label={t('wo.proteinField')}>
            <NumberInput min={0} max={500} value={protein} onChange={setProtein} />
          </Field>
          <Button type="submit" className="col-span-3">
            {t('wo.addMeal')}
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">{t('wo.todayHeading')}</h2>
        <ul className="space-y-1 text-sm">
          {meals
            .filter((m) => m.date === today)
            .map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                {t('wo.mealLine', { desc: m.description, g: m.protein })}
                <Button
                  variant="ghost"
                  onClick={() => deleteWithUndo(() => remove('meals', m.id))}
                  aria-label={t('wo.deleteMeal', { desc: m.description })}
                >
                  ✕
                </Button>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  )
}
