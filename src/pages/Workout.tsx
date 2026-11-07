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
import { useStore } from '../store'
import { tooltipProps } from '../components/chart'
import { Button, Card, Field, Input, PageTitle, Select, Tabs } from '../components/ui'
import NumberInput from '../components/NumberInput'
import type { Workout as WorkoutT, WorkoutExercise, WorkoutPlan } from '../types'
import { formatShort, todayStr, weekdayName } from '../lib/dates'
import {
  exerciseHistory,
  exerciseNames,
  getSplits,
  newRecords,
  proteinOn,
  totalVolume,
  workoutsInWeek,
} from '../lib/workout'
import { XP } from '../lib/xp'
import { useT } from '../i18n'
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

function Training() {
  const { t } = useT()
  const { workouts, templates, settings, add, remove, update, award } = useStore(
    useShallow((s) => ({
      award: s.award,
      workouts: s.workouts,
      templates: s.workoutTemplates,
      settings: s.settings,
      add: s.add,
      remove: s.remove,
      update: s.update,
    })),
  )
  const today = todayStr()
  const [type, setType] = useState(() => t('plan.workoutTitle'))
  const [duration, setDuration] = useState(60)
  const [feeling, setFeeling] = useState(3)
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [msg, setMsg] = useState('')
  const [tplId, setTplId] = useState('')
  const [chartEx, setChartEx] = useState('')
  const names = exerciseNames(workouts)
  const chosen = chartEx || names[0] || ''
  const history = chosen ? exerciseHistory(workouts, chosen) : []
  const weekCount = workoutsInWeek(workouts, today).length
  const last = [...workouts].sort((a, b) => b.date.localeCompare(a.date))[0]

  const setRow = (i: number, p: Partial<Row>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)))

  function toExercises(): WorkoutExercise[] {
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
  function save(e: React.FormEvent) {
    e.preventDefault()
    const exercises = toExercises()
    if (exercises.length === 0) return setMsg(t('wo.needsExercise'))
    const records = newRecords({ exercises }, workouts)
    const id = add('workouts', {
      date: today,
      type,
      durationMin: duration,
      exercises,
      feeling: feeling as WorkoutT['feeling'],
    })
    award({
      id: `workout-${id}`,
      date: today,
      reason: t('wo.xp.workout', { type }),
      xp: XP.workout,
      category: 'workout',
    })
    records.forEach((r) =>
      award({
        id: `pr-${id}-${r.name}`,
        date: today,
        reason: t('wo.xp.record', { name: r.name, kg: r.weight }),
        xp: XP.personalRecord,
        category: 'workout',
      }),
    )
    setMsg(
      records.length
        ? t('wo.record', {
            list: records
              .map((r) => t('wo.recordItem', { name: r.name, kg: r.weight, before: r.before }))
              .join(', '),
          })
        : t('wo.saved'),
    )
    setRows([emptyRow()])
  }
  function saveTemplate() {
    const exercises = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), sets: r.sets, reps: r.reps, weight: r.weight }))
    if (exercises.length === 0) {
      setMsg(t('wo.tplNeedsExercise'))
      return
    }
    const name = type.trim() || t('wo.tplDefaultName')
    const existing = templates.find((x) => x.name.toLowerCase() === name.toLowerCase())
    if (existing) remove('workoutTemplates', existing.id)
    const id = add('workoutTemplates', { name, type: type.trim() || name, exercises })
    setTplId(id)
    setMsg(t('wo.tplSaved', { name }))
  }
  function renameTemplate() {
    const name = type.trim()
    const tpl = templates.find((x) => x.id === tplId)
    if (!tpl || !name) return
    update('workoutTemplates', tpl.id, { name })
    setMsg(t('wo.tplRenamed', { name }))
  }
  function loadTemplate(id: string) {
    setTplId(id)
    const tpl = templates.find((x) => x.id === id)
    if (!tpl) return
    setType(tpl.type)
    setRows(tpl.exercises.map((e) => ({ ...e })))
  }
  function repeatLast() {
    if (!last) return
    setType(last.type)
    setRows(
      last.exercises.map((e) => ({
        name: e.name,
        sets: e.sets.length,
        reps: e.sets[0]?.reps ?? 8,
        weight: Math.max(0, ...e.sets.map((s) => s.weight)),
      })),
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm">
          <Rich text={t('wo.thisWeek', { n: weekCount, goal: settings.workoutsPerWeek })} />
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

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t('wo.new')}</h2>
          {last && (
            <Button variant="ghost" onClick={repeatLast}>
              {t('wo.repeat')}
            </Button>
          )}
        </div>
        {templates.length > 0 && (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1">
              <Field label={t('wo.templates')}>
                <Select value={tplId} onChange={(e) => loadTemplate(e.target.value)}>
                  <option value="">{t('wo.pickTemplate')}</option>
                  {templates.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({x.exercises.length})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              variant="ghost"
              disabled={!tplId}
              aria-label={t('wo.deleteTemplateAria')}
              onClick={() => {
                remove('workoutTemplates', tplId)
                setTplId('')
              }}
            >
              {t('wo.deleteTemplate')}
            </Button>
            <Button variant="ghost" disabled={!tplId || !type.trim()} onClick={renameTemplate}>
              {t('wo.renameTemplate')}
            </Button>
          </div>
        )}
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label={t('wo.f.type')}>
              <Input value={type} onChange={(e) => setType(e.target.value)} />
            </Field>
            <Field label={t('wo.f.duration')}>
              <NumberInput min={1} max={600} value={duration} onChange={setDuration} />
            </Field>
            <Field label={t('wo.f.feeling')}>
              <NumberInput min={1} max={5} value={feeling} onChange={setFeeling} />
            </Field>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <div className="col-span-4">
                <Input
                  aria-label={t('wo.exerciseAria', { n: i + 1 })}
                  list="ex-names"
                  placeholder={t('wo.exercisePlaceholder')}
                  value={r.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                />
              </div>
              <NumberInput
                aria-label={t('wo.setsAria', { n: i + 1 })}
                min={1}
                max={50}
                value={r.sets}
                onChange={(v) => setRow(i, { sets: v })}
              />
              <NumberInput
                aria-label={t('wo.repsAria', { n: i + 1 })}
                min={1}
                max={500}
                value={r.reps}
                onChange={(v) => setRow(i, { reps: v })}
              />
              <NumberInput
                aria-label={t('wo.weightAria', { n: i + 1 })}
                min={0}
                max={1000}
                step={0.5}
                value={r.weight}
                onChange={(v) => setRow(i, { weight: v })}
              />
              <Button
                variant="ghost"
                onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                aria-label={t('wo.removeExercise', { n: i + 1 })}
              >
                ✕
              </Button>
            </div>
          ))}
          <datalist id="ex-names">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <p className="text-xs text-slate-500">{t('wo.fieldsHelp')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => setRows((r) => [...r, emptyRow()])}>
              {t('wo.addExercise')}
            </Button>
            <Button variant="soft" onClick={saveTemplate}>
              {t('wo.saveTemplate')}
            </Button>
            <Button type="submit">{t('wo.save')}</Button>
          </div>
        </form>
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
              <LineChart data={history}>
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
        {workouts.length === 0 && <p className="text-sm text-slate-500">{t('wo.noHistory')}</p>}
        <ul className="space-y-2 text-sm">
          {[...workouts]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-2">
                <span>
                  <Rich
                    text={t('wo.historyLine', {
                      date: formatShort(w.date),
                      type: w.type,
                      min: w.durationMin,
                      f: w.feeling,
                      exercises: t('wo.exercises', { n: w.exercises.length }),
                      vol: totalVolume(w),
                    })}
                  />
                </span>
                <Button
                  variant="ghost"
                  onClick={() => remove('workouts', w.id)}
                  aria-label={t('wo.deleteWorkout', { date: w.date })}
                >
                  {t('common.delete')}
                </Button>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  )
}

function Plan() {
  const { t } = useT()
  const { plan, patch } = useStore(useShallow((s) => ({ plan: s.workoutPlan, patch: s.patch })))
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 font-semibold">{t('wo.splits')}</h2>
        <div className="flex flex-wrap gap-2">
          {getSplits().map((s) => (
            <Button
              key={s.name}
              variant={plan?.name === s.name ? 'primary' : 'soft'}
              onClick={() => patch({ workoutPlan: s })}
            >
              {s.name}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('wo.splitsNote')}</p>
      </Card>
      {plan ? <PlanView plan={plan} /> : <Card className="text-sm">{t('wo.pickSplit')}</Card>}
    </div>
  )
}

function PlanView({ plan }: { plan: WorkoutPlan }) {
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
        {plan.days.map((d) => (
          <li key={d.day + d.title}>
            <strong>{t('wo.planDay', { day: weekdayName(d.day), title: d.title })}</strong>
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
  const today = todayStr()
  const [desc, setDesc] = useState('')
  const [protein, setProtein] = useState(30)
  const total = proteinOn(meals, today)
  const pct = Math.min(100, (total / Math.max(1, goal)) * 100)
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim()) return
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
            <Field label={t('wo.meal')}>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
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
                  onClick={() => remove('meals', m.id)}
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
