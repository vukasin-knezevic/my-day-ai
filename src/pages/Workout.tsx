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
import { Button, Card, Field, Input, PageTitle, Select } from '../components/ui'
import NumberInput from '../components/NumberInput'
import type { Workout as WorkoutT, WorkoutExercise, WorkoutPlan } from '../types'
import { WEEKDAY_NAMES, formatShort, todayStr } from '../lib/dates'
import {
  SPLITS,
  exerciseHistory,
  exerciseNames,
  newRecords,
  proteinOn,
  totalVolume,
  workoutsInWeek,
} from '../lib/workout'
import { XP } from '../lib/xp'

type Tab = 'trening' | 'plan' | 'ishrana'

export default function Workout() {
  const [tab, setTab] = useState<Tab>('trening')
  const tabs: [Tab, string][] = [
    ['trening', 'Trening'],
    ['plan', 'Plan'],
    ['ishrana', 'Ishrana'],
  ]
  return (
    <>
      <PageTitle>🏋️ Trening i 🍗 ishrana</PageTitle>
      <div role="tablist" className="mb-4 flex gap-2">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium ${tab === k ? 'bg-orange-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>
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
  const { workouts, templates, settings, add, remove, award } = useStore(
    useShallow((s) => ({
      award: s.award,
      workouts: s.workouts,
      templates: s.workoutTemplates,
      settings: s.settings,
      add: s.add,
      remove: s.remove,
    })),
  )
  const today = todayStr()
  const [type, setType] = useState('Trening')
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
      reason: `Trening: ${type}`,
      xp: XP.workout,
      category: 'workout',
    })
    records.forEach((r) =>
      award({
        id: `pr-${id}-${r.name}`,
        date: today,
        reason: `Rekord: ${r.name} ${r.weight} kg`,
        xp: XP.personalRecord,
        category: 'workout',
      }),
    )
    setMsg(
      records.length
        ? `🎉 Novi rekord: ${records.map((r) => `${r.name} ${r.weight} kg (bilo ${r.before})`).join(', ')}`
        : '💪 Trening sačuvan!',
    )
    setRows([emptyRow()])
  }
  function saveTemplate() {
    const exercises = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), sets: r.sets, reps: r.reps, weight: r.weight }))
    if (exercises.length === 0) {
      setMsg('Dodaj bar jednu vežbu da bi sačuvao šablon.')
      return
    }
    const name = type.trim() || 'Šablon'
    const existing = templates.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) remove('workoutTemplates', existing.id)
    const id = add('workoutTemplates', { name, type: type.trim() || name, exercises })
    setTplId(id)
    setMsg(`📌 Šablon „${name}" sačuvan.`)
  }
  function loadTemplate(id: string) {
    setTplId(id)
    const t = templates.find((x) => x.id === id)
    if (!t) return
    setType(t.type)
    setRows(t.exercises.map((e) => ({ ...e })))
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
          Ove nedelje: <strong>{weekCount}</strong> / {settings.workoutsPerWeek} treninga
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={weekCount}
          aria-valuemax={settings.workoutsPerWeek}
          aria-label="Treninzi ove nedelje"
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
          <h2 className="font-semibold">Novi trening</h2>
          {last && (
            <Button variant="ghost" onClick={repeatLast}>
              Ponovi poslednji
            </Button>
          )}
        </div>
        {templates.length > 0 && (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1">
              <Field label="Moji šabloni">
                <Select value={tplId} onChange={(e) => loadTemplate(e.target.value)}>
                  <option value="">— izaberi šablon —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.exercises.length})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              variant="ghost"
              disabled={!tplId}
              aria-label="Obriši izabrani šablon"
              onClick={() => {
                remove('workoutTemplates', tplId)
                setTplId('')
              }}
            >
              Obriši šablon
            </Button>
          </div>
        )}
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Tip">
              <Input value={type} onChange={(e) => setType(e.target.value)} />
            </Field>
            <Field label="Trajanje (min)">
              <NumberInput min={1} max={600} value={duration} onChange={setDuration} />
            </Field>
            <Field label="Osećaj (1–5)">
              <NumberInput min={1} max={5} value={feeling} onChange={setFeeling} />
            </Field>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <div className="col-span-4">
                <Input
                  aria-label={`Vežba ${i + 1}`}
                  list="ex-names"
                  placeholder="Vežba (npr. Bench press)"
                  value={r.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                />
              </div>
              <NumberInput
                aria-label={`Serije ${i + 1}`}
                min={1}
                max={50}
                value={r.sets}
                onChange={(v) => setRow(i, { sets: v })}
              />
              <NumberInput
                aria-label={`Ponavljanja ${i + 1}`}
                min={1}
                max={500}
                value={r.reps}
                onChange={(v) => setRow(i, { reps: v })}
              />
              <NumberInput
                aria-label={`Kilaža ${i + 1}`}
                min={0}
                max={1000}
                step={0.5}
                value={r.weight}
                onChange={(v) => setRow(i, { weight: v })}
              />
              <Button
                variant="ghost"
                onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                aria-label={`Ukloni vežbu ${i + 1}`}
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
          <p className="text-xs text-slate-500">Polja: serije · ponavljanja · kilaža (kg)</p>
          <div className="flex gap-2">
            <Button variant="soft" onClick={() => setRows((r) => [...r, emptyRow()])}>
              + Vežba
            </Button>
            <Button variant="soft" onClick={saveTemplate}>
              📌 Sačuvaj kao šablon
            </Button>
            <Button type="submit">Sačuvaj trening</Button>
          </div>
        </form>
      </Card>

      {names.length > 0 && (
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Napredak kilaže</h2>
            <Select
              aria-label="Vežba za grafikon"
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
        <h2 className="mb-2 font-semibold">Istorija</h2>
        {workouts.length === 0 && <p className="text-sm text-slate-500">Još nema treninga.</p>}
        <ul className="space-y-2 text-sm">
          {[...workouts]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-2">
                <strong>{formatShort(w.date)}</strong> {w.type} · {w.durationMin} min · osećaj{' '}
                {w.feeling}/5 · {w.exercises.length} vežbi · obim {totalVolume(w)} kg
                <Button
                  variant="ghost"
                  onClick={() => remove('workouts', w.id)}
                  aria-label={`Obriši trening ${w.date}`}
                >
                  Obriši
                </Button>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  )
}

function Plan() {
  const { plan, patch } = useStore(useShallow((s) => ({ plan: s.workoutPlan, patch: s.patch })))
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 font-semibold">Gotovi splitovi</h2>
        <div className="flex flex-wrap gap-2">
          {SPLITS.map((s) => (
            <Button
              key={s.name}
              variant={plan?.name === s.name ? 'primary' : 'soft'}
              onClick={() => patch({ workoutPlan: s })}
            >
              {s.name}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Plan po tvom cilju i rasporedu faksa pravi AI (stranica 🤖 AI).
        </p>
      </Card>
      {plan ? <PlanView plan={plan} /> : <Card className="text-sm">Izaberi split iznad.</Card>}
    </div>
  )
}

function PlanView({ plan }: { plan: WorkoutPlan }) {
  return (
    <Card>
      <h2 className="mb-2 font-semibold">
        {plan.name}{' '}
        <span className="text-xs text-slate-500">({plan.source === 'ai' ? 'AI' : 'šablon'})</span>
      </h2>
      <ul className="space-y-3 text-sm">
        {plan.days.map((d) => (
          <li key={d.day + d.title}>
            <strong>
              {WEEKDAY_NAMES[d.day]} — {d.title}
            </strong>
            <ul className="ml-4 list-disc">
              {d.exercises.map((e) => (
                <li key={e.name}>
                  {e.name}: {e.sets} × {e.reps}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Food() {
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
          Protein danas: <strong>{total} g</strong> / {goal} g
        </p>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={total}
          aria-valuemax={goal}
          aria-label="Protein danas"
        >
          <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
        </div>
        {total >= goal && <p className="mt-1 text-sm">🎉 Cilj proteina dostignut!</p>}
      </Card>
      <Card>
        <form onSubmit={submit} className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Field label="Obrok">
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="npr. piletina i pirinač"
              />
            </Field>
          </div>
          <Field label="Protein (g)">
            <NumberInput min={0} max={500} value={protein} onChange={setProtein} />
          </Field>
          <Button type="submit" className="col-span-3">
            Dodaj obrok
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Danas</h2>
        <ul className="space-y-1 text-sm">
          {meals
            .filter((m) => m.date === today)
            .map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                {m.description} · {m.protein} g
                <Button
                  variant="ghost"
                  onClick={() => remove('meals', m.id)}
                  aria-label={`Obriši obrok ${m.description}`}
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
