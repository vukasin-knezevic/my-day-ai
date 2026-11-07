import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, selectData } from '../store'
import { tooltipProps } from '../components/chart'
import { Badge, Button, Card, Field, Input, PageTitle, Select } from '../components/ui'
import NumberInput from '../components/NumberInput'
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Habit, type SleepLog } from '../types'
import { XP } from '../lib/xp'
import { addDaysStr, formatShort, monthOf, todayStr } from '../lib/dates'
import { applyParsed } from '../lib/apply'
import { occurrencesOn } from '../lib/schedule'
import { currencyOf, expenseLabel } from '../lib/labels'
import { useT } from '../i18n'
import type { BaseKey } from '../i18n'
import Rich from '../i18n/Rich'
import {
  avgSleep,
  budgetStatus,
  fmtMoney,
  habitDone,
  habitStreak,
  sleepHours,
  spentByCategory,
  suggestBedtime,
} from '../lib/life'

type Tab = 'san' | 'novac' | 'navike'

export default function Life() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('san')
  const tabs: [Tab, BaseKey][] = [
    ['san', 'life.tab.sleep'],
    ['novac', 'life.tab.money'],
    ['navike', 'life.tab.habits'],
  ]
  return (
    <>
      <PageTitle>{t('life.title')}</PageTitle>
      <div role="tablist" className="mb-4 flex gap-2">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium ${tab === k ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            {t(label)}
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
  const { t } = useT()
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
            {t('life.bed')}
          </Button>
          <Button
            variant="soft"
            disabled={!open}
            onClick={() =>
              applyParsed({ kind: 'sleep', event: 'wake', time: hhmm, date: today }, store)
            }
          >
            {t('life.wake')}
          </Button>
        </div>
        {open && (
          <p className="mt-2 text-sm">
            {t('life.sleepingSince', { time: open.bedtime.slice(11, 16) })}
          </p>
        )}
        <p className="mt-2 text-sm">
          <Rich text={t('life.avg', { avg: avg ?? '—', goal: data.settings.sleepGoalHours })} />
        </p>
        <p className="text-sm">
          <Rich text={t('life.suggestion', { time: suggest, first })} />
        </p>
      </Card>
      {last && <Quality log={last} />}
      <Card>
        <h2 className="mb-2 font-semibold">{t('life.chart7')}</h2>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatShort} fontSize={11} />
              <YAxis fontSize={11} width={30} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="h" fill="#8b5cf6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function Quality({ log }: { log: SleepLog }) {
  const { t } = useT()
  const update = useStore((s) => s.update)
  return (
    <Card>
      <p className="mb-2 text-sm">
        {t('life.lastSleep', { date: formatShort(log.date), h: sleepHours(log) ?? '—' })}
      </p>
      <div className="flex gap-1">
        {([1, 2, 3, 4, 5] as const).map((q) => (
          <Button
            key={q}
            variant={log.quality === q ? 'primary' : 'soft'}
            aria-label={t('life.qualityAria', { q })}
            onClick={() => update('sleep', log.id, { quality: q })}
          >
            {q}
          </Button>
        ))}
      </div>
    </Card>
  )
}

function Money() {
  const { t } = useT()
  const { expenses, budget, currency, add, remove, patch } = useStore(
    useShallow((s) => ({
      expenses: s.expenses,
      budget: s.budget,
      currency: currencyOf(s.settings),
      add: s.add,
      remove: s.remove,
      patch: s.patch,
    })),
  )
  const today = todayStr()
  const month = monthOf(today)
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState<ExpenseCategory>('hrana')
  const [desc, setDesc] = useState('')
  const status = budgetStatus(expenses, budget, month)
  const spent = spentByCategory(expenses, month)
  const total = Object.values(spent).reduce((a, b) => a + b, 0)
  const chart = EXPENSE_CATEGORIES.map((c) => ({ name: expenseLabel(c), rsd: spent[c] }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = amount
    if (!n || n <= 0) return
    add('expenses', { date: today, amount: n, category, description: desc.trim() })
    setAmount(0)
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
            {t('life.budgetAlert', {
              emoji: s.level === 'over' ? '🚨' : '⚠️',
              cat: expenseLabel(s.category),
              pct: s.pct,
              spent: fmtMoney(s.spent, currency),
              limit: fmtMoney(s.limit, currency),
            })}
          </p>
        ))}
      <Card>
        <form onSubmit={submit} className="grid grid-cols-2 gap-2">
          <Field label={t('life.amount', { cur: currency })}>
            <NumberInput min={1} max={10000000} value={amount} onChange={setAmount} />
          </Field>
          <Field label={t('act.category')}>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {expenseLabel(c)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-2">
            <Field label={t('life.desc')}>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" className="col-span-2">
            {t('life.addExpense')}
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">
          {t('life.thisMonth', { total: fmtMoney(total, currency) })}
        </h2>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} width={45} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="rsd" fill="#eab308" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">{t('life.budget', { cur: currency })}</h2>
        <div className="grid grid-cols-2 gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <Field key={c} label={expenseLabel(c)}>
              <NumberInput
                min={0}
                max={10000000}
                value={budget[c]}
                onChange={(v) => patch({ budget: { ...budget, [c]: v } })}
                onEmpty={() => patch({ budget: { ...budget, [c]: undefined } })}
              />
            </Field>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">{t('life.recent')}</h2>
        <ul className="space-y-1 text-sm">
          {[...expenses]
            .reverse()
            .slice(0, 15)
            .map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                {t('life.expenseLine', {
                  date: formatShort(e.date),
                  amount: fmtMoney(e.amount, currency),
                  cat: expenseLabel(e.category),
                })}{' '}
                {e.description && `· ${e.description}`}
                <Button
                  variant="ghost"
                  aria-label={t('life.deleteExpense', { amount: e.amount })}
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
  const { t } = useT()
  const { habits, add, update, remove, award, revoke } = useStore(
    useShallow((s) => ({
      habits: s.habits,
      add: s.add,
      update: s.update,
      remove: s.remove,
      award: s.award,
      revoke: s.revoke,
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
    else revoke(`habit-${h.id}-${today}`)
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
              {streak > 0 && (
                <Badge className="bg-orange-100 text-orange-800">
                  {t('life.streakBadge', { n: streak })}
                </Badge>
              )}
              {habitDone(h, today) && (
                <Badge className="bg-teal-100 text-teal-800">{t('life.habitDone')}</Badge>
              )}
              <Button
                variant="ghost"
                className="ml-auto"
                aria-label={t('life.deleteHabit', { name: h.name })}
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
                {t('life.doneToday')}
              </label>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Button
                  variant="soft"
                  aria-label={t('life.less', { name: h.name })}
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
                  aria-label={t('life.more', { name: h.name })}
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
        <h2 className="mb-2 font-semibold">{t('life.newHabit')}</h2>
        <form onSubmit={submit} className="grid grid-cols-4 gap-2">
          <div className="col-span-3">
            <Field label={t('life.habitName')}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('life.habitPlaceholder')}
              />
            </Field>
          </div>
          <Field label={t('life.habitEmoji')}>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </Field>
          <Field label={t('life.habitGoal')}>
            <NumberInput min={0.5} max={10000} step={0.5} value={goal} onChange={setGoal} />
          </Field>
          <div className="col-span-2">
            <Field label={t('life.habitUnit')}>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" className="col-span-4">
            {t('life.addHabit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
