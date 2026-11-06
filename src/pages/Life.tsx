import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, selectData } from '../store'
import { Badge, Button, Card, Field, Input, PageTitle, Select } from '../components/ui'
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Habit, type SleepLog } from '../types'
import { XP } from '../lib/xp'
import { addDaysStr, formatShort, monthOf, todayStr } from '../lib/dates'
import { applyParsed } from '../lib/apply'
import { occurrencesOn } from '../lib/schedule'
import {
  avgSleep,
  budgetStatus,
  fmtRsd,
  habitDone,
  habitStreak,
  sleepHours,
  spentByCategory,
  suggestBedtime,
} from '../lib/life'

type Tab = 'san' | 'novac' | 'navike'

export default function Life() {
  const [tab, setTab] = useState<Tab>('san')
  const tabs: [Tab, string][] = [
    ['san', '😴 San'],
    ['novac', '💰 Novac'],
    ['navike', '✅ Navike'],
  ]
  return (
    <>
      <PageTitle>Život</PageTitle>
      <div role="tablist" className="mb-4 flex gap-2">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium ${tab === k ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'san' && <Sleep />}
      {tab === 'novac' && <Money />}
      {tab === 'navike' && <Habits />}
    </>
  )
}

function Sleep() {
  const data = useStore(useShallow(selectData))
  const store = useStore()
  const today = todayStr()
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const open = [...data.sleep].reverse().find((s) => s.wakeTime === null)
  const avg = avgSleep(data.sleep, today)
  const tomorrow = occurrencesOn(data, addDaysStr(today, 1)).filter((o) => !o.suggested)
  const first = tomorrow[0]?.start ?? data.settings.wakeTime
  const suggest = suggestBedtime(first, data.settings.sleepGoalHours)
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysStr(today, i - 6)
    const log = data.sleep.find((s) => s.date === d && s.wakeTime)
    return { date: d, h: log ? (sleepHours(log) ?? 0) : 0 }
  })
  const last = [...data.sleep]
    .filter((s) => s.wakeTime)
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!!open}
            onClick={() =>
              applyParsed({ kind: 'sleep', event: 'bed', time: hhmm, date: today }, store)
            }
          >
            😴 Legao
          </Button>
          <Button
            variant="soft"
            disabled={!open}
            onClick={() =>
              applyParsed({ kind: 'sleep', event: 'wake', time: hhmm, date: today }, store)
            }
          >
            🌅 Ustao
          </Button>
        </div>
        {open && (
          <p className="mt-2 text-sm">
            Spavaš od {open.bedtime.slice(11, 16)}. Kad ustaneš, klikni „Ustao".
          </p>
        )}
        <p className="mt-2 text-sm">
          Prosek 7 dana: <strong>{avg ?? '—'} h</strong> (cilj {data.settings.sleepGoalHours} h)
        </p>
        <p className="text-sm">
          💡 Predlog za večeras: legni oko <strong>{suggest}</strong> (sutra prva obaveza u {first}
          ).
        </p>
      </Card>
      {last && <Quality log={last} />}
      <Card>
        <h2 className="mb-2 font-semibold">Poslednjih 7 dana (sati)</h2>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatShort} fontSize={11} />
              <YAxis fontSize={11} width={30} />
              <Tooltip />
              <Bar dataKey="h" fill="#8b5cf6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function Quality({ log }: { log: SleepLog }) {
  const update = useStore((s) => s.update)
  return (
    <Card>
      <p className="mb-2 text-sm">
        Poslednji san ({formatShort(log.date)}, {sleepHours(log)} h) — kako je bio?
      </p>
      <div className="flex gap-1">
        {([1, 2, 3, 4, 5] as const).map((q) => (
          <Button
            key={q}
            variant={log.quality === q ? 'primary' : 'soft'}
            aria-label={`Kvalitet sna ${q}`}
            onClick={() => update('sleep', log.id, { quality: q })}
          >
            {q}
          </Button>
        ))}
      </div>
    </Card>
  )
}

const CAT_LABEL: Record<ExpenseCategory, string> = {
  hrana: 'Hrana',
  prevoz: 'Prevoz',
  igre: 'Igre',
  faks: 'Faks',
  izlasci: 'Izlasci',
  ostalo: 'Ostalo',
}

function Money() {
  const { expenses, budget, add, remove, patch } = useStore(
    useShallow((s) => ({
      expenses: s.expenses,
      budget: s.budget,
      add: s.add,
      remove: s.remove,
      patch: s.patch,
    })),
  )
  const today = todayStr()
  const month = monthOf(today)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('hrana')
  const [desc, setDesc] = useState('')
  const status = budgetStatus(expenses, budget, month)
  const spent = spentByCategory(expenses, month)
  const total = Object.values(spent).reduce((a, b) => a + b, 0)
  const chart = EXPENSE_CATEGORIES.map((c) => ({ name: CAT_LABEL[c], rsd: spent[c] }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!n || n <= 0) return
    add('expenses', { date: today, amount: n, category, description: desc.trim() })
    setAmount('')
    setDesc('')
  }

  return (
    <div className="space-y-4">
      {status
        .filter((s) => s.level !== 'ok')
        .map((s) => (
          <p
            key={s.category}
            role="alert"
            className={`rounded-xl p-3 text-sm font-medium ${s.level === 'over' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}
          >
            {s.level === 'over' ? '🚨' : '⚠️'} {CAT_LABEL[s.category]}: potrošeno {s.pct}% budžeta (
            {fmtRsd(s.spent)} od {fmtRsd(s.limit)})
          </p>
        ))}
      <Card>
        <form onSubmit={submit} className="grid grid-cols-2 gap-2">
          <Field label="Iznos (RSD)">
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Kategorija">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CAT_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-2">
            <Field label="Opis">
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" className="col-span-2">
            Dodaj trošak
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">Ovaj mesec: {fmtRsd(total)}</h2>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} width={45} />
              <Tooltip />
              <Bar dataKey="rsd" fill="#eab308" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Mesečni budžet (RSD)</h2>
        <div className="grid grid-cols-2 gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <Field key={c} label={CAT_LABEL[c]}>
              <Input
                type="number"
                min={0}
                value={budget[c] ?? ''}
                onChange={(e) =>
                  patch({
                    budget: {
                      ...budget,
                      [c]: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Poslednji troškovi</h2>
        <ul className="space-y-1 text-sm">
          {[...expenses]
            .reverse()
            .slice(0, 15)
            .map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                {formatShort(e.date)} · {fmtRsd(e.amount)} · {CAT_LABEL[e.category]}{' '}
                {e.description && `· ${e.description}`}
                <Button
                  variant="ghost"
                  aria-label={`Obriši trošak ${e.amount}`}
                  onClick={() => remove('expenses', e.id)}
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

function Habits() {
  const { habits, add, update, remove, award } = useStore(
    useShallow((s) => ({
      habits: s.habits,
      add: s.add,
      update: s.update,
      remove: s.remove,
      award: s.award,
    })),
  )
  const today = todayStr()

  /** Saves today's amount; reaching the goal gives XP once per day. */
  function setEntry(h: Habit, value: number) {
    update('habits', h.id, { entries: { ...h.entries, [today]: value } })
    if (value >= h.goal)
      award({
        id: `habit-${h.id}-${today}`,
        date: today,
        reason: h.name,
        xp: XP.habit,
        category: 'habits',
      })
  }
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('💧')
  const [goal, setGoal] = useState(1)
  const [unit, setUnit] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    add('habits', { name: name.trim(), emoji, goal, unit, entries: {} })
    setName('')
  }
  return (
    <div className="space-y-4">
      {habits.map((h) => {
        const v = h.entries[today] ?? 0
        const streak = habitStreak(h, today)
        return (
          <Card key={h.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl" aria-hidden>
                {h.emoji}
              </span>
              <strong>{h.name}</strong>
              {streak > 0 && <Badge className="bg-orange-100 text-orange-800">🔥 {streak} d</Badge>}
              {habitDone(h, today) && <Badge className="bg-teal-100 text-teal-800">urađeno</Badge>}
              <Button
                variant="ghost"
                className="ml-auto"
                aria-label={`Obriši naviku ${h.name}`}
                onClick={() => remove('habits', h.id)}
              >
                ✕
              </Button>
            </div>
            {h.goal === 1 && !h.unit ? (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={v >= 1}
                  onChange={(e) => setEntry(h, e.target.checked ? 1 : 0)}
                />
                Danas urađeno
              </label>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Button
                  variant="soft"
                  aria-label={`Manje ${h.name}`}
                  onClick={() =>
                    setEntry(h, Math.max(0, +(v - (h.goal >= 10 ? 5 : 0.5)).toFixed(1)))
                  }
                >
                  −
                </Button>
                <span>
                  {v} / {h.goal} {h.unit}
                </span>
                <Button
                  variant="soft"
                  aria-label={`Više ${h.name}`}
                  onClick={() => setEntry(h, +(v + (h.goal >= 10 ? 5 : 0.5)).toFixed(1))}
                >
                  +
                </Button>
              </div>
            )}
          </Card>
        )
      })}
      <Card>
        <h2 className="mb-2 font-semibold">Nova navika</h2>
        <form onSubmit={submit} className="grid grid-cols-4 gap-2">
          <div className="col-span-3">
            <Field label="Naziv">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Voda, čitanje, šetnja…"
              />
            </Field>
          </div>
          <Field label="Emotikon">
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </Field>
          <Field label="Cilj (broj)">
            <Input
              type="number"
              min={1}
              step={0.5}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Jedinica (L, min…)">
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" className="col-span-4">
            Dodaj naviku
          </Button>
        </form>
      </Card>
    </div>
  )
}
