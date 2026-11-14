import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../store'
import { tooltipProps } from '../components/chart'
import { Badge, Button, Card, Field, Input, PageTitle, Select, Tabs } from '../components/ui'
import NumberInput from '../components/NumberInput'
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Habit } from '../types'
import { XP } from '../lib/xp'
import { DateField } from '../components/Pickers'
import Sheet from '../components/Sheet'
import { formatShort, monthOf } from '../lib/dates'
import { currencyOf, expenseLabel } from '../lib/labels'
import { deleteWithUndo } from '../lib/undo'
import { useT } from '../i18n'
import { useToday } from '../lib/useToday'
import {
  budgetStatus,
  fmtMoney,
  habitDone,
  habitStreak,
  spentByCategory,
  habitStep,
} from '../lib/life'

type Tab = 'novac' | 'navike'

export default function Life() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('novac')
  const tabs: [Tab, string][] = [
    ['novac', t('life.tab.money')],
    ['navike', t('life.tab.habits')],
  ]
  return (
    <>
      <PageTitle>{t('life.title')}</PageTitle>
      <Tabs tabs={tabs} active={tab} activeClass="bg-violet-600" onChange={setTab} />
      {tab === 'novac' && <Money />}
      {tab === 'navike' && <Habits />}
    </>
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
  const today = useToday()
  const month = monthOf(today)
  const [amount, setAmount] = useState(0)
  const [amountError, setAmountError] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('hrana')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [showAll, setShowAll] = useState(false)
  const status = budgetStatus(expenses, budget, month)
  const spent = spentByCategory(expenses, month)
  const total = Object.values(spent).reduce((a, b) => a + b, 0)
  const chart = EXPENSE_CATEGORIES.map((c) => ({ name: expenseLabel(c), rsd: spent[c] }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = amount
    if (!n || n <= 0) {
      setAmountError(t('common.required'))
      return
    }
    setAmountError('')
    add('expenses', { date: date || today, amount: n, category, description: desc.trim() })
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
          <Field label={t('life.amount', { cur: currency })} required error={amountError}>
            <NumberInput
              min={1}
              max={10000000}
              value={amount}
              onChange={(v) => {
                setAmount(v)
                setAmountError('')
              }}
            />
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
            <Field label={t('life.date')}>
              <DateField value={date || today} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label={t('life.desc')} optional>
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
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, showAll ? undefined : 15)
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
                  onClick={() => deleteWithUndo(() => remove('expenses', e.id))}
                >
                  ✕
                </Button>
              </li>
            ))}
        </ul>
        {expenses.length > 15 && (
          <Button variant="ghost" className="mt-2" onClick={() => setShowAll(!showAll)}>
            {showAll ? t('life.showLess') : t('life.showAll', { n: expenses.length })}
          </Button>
        )}
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
  const today = useToday()

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
  const [nameError, setNameError] = useState('')
  const [emoji, setEmoji] = useState('💧')
  const [goal, setGoal] = useState(1)
  const [unit, setUnit] = useState('')
  const [editing, setEditing] = useState<Habit | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError(t('common.required'))
      return
    }
    setNameError('')
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
              <strong className="user-text">{h.name}</strong>
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
                aria-label={t('life.editHabit', { name: h.name })}
                onClick={() => setEditing(h)}
              >
                ✎
              </Button>
              <Button
                variant="ghost"
                aria-label={t('life.deleteHabit', { name: h.name })}
                onClick={() => deleteWithUndo(() => remove('habits', h.id))}
              >
                ✕
              </Button>
            </div>
            {h.goal === 1 && !h.unit ? (
              <div className="mt-2 flex items-center text-sm">
                {/* Only the box toggles (a 44 px zone around it), not the text. */}
                <label className="-ml-3 flex size-11 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    className="size-5"
                    aria-label={t('life.doneToday')}
                    checked={v >= 1}
                    onChange={(e) => setEntry(h, e.target.checked ? 1 : 0)}
                  />
                </label>
                <span aria-hidden>{t('life.doneToday')}</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Button
                  variant="soft"
                  aria-label={t('life.less', { name: h.name })}
                  onClick={() =>
                    setEntry(h, Math.max(0, +(v - habitStep(h.goal, h.unit)).toFixed(1)))
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
                  onClick={() => setEntry(h, +(v + habitStep(h.goal, h.unit)).toFixed(1))}
                >
                  +
                </Button>
              </div>
            )}
          </Card>
        )
      })}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={t('life.editHabitTitle')}>
        {editing && (
          <form
            className="grid grid-cols-4 gap-2 pb-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!editing.name.trim()) return
              update('habits', editing.id, {
                name: editing.name.trim(),
                emoji: editing.emoji,
                goal: editing.goal,
                unit: editing.unit,
              })
              setEditing(null)
            }}
          >
            <div className="col-span-3">
              <Field label={t('life.habitName')} required>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
            </div>
            <Field label={t('life.habitEmoji')}>
              <Input
                value={editing.emoji}
                onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
              />
            </Field>
            <div className="col-span-2">
              <Field label={t('life.habitGoal')}>
                <NumberInput
                  min={0.5}
                  max={10000}
                  step={0.5}
                  value={editing.goal}
                  onChange={(v) => setEditing({ ...editing, goal: v })}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label={t('life.habitUnit')} optional>
                <Input
                  value={editing.unit}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" className="col-span-4">
              {t('life.habitSave')}
            </Button>
          </form>
        )}
      </Sheet>
      <Card>
        <h2 className="mb-2 font-semibold">{t('life.newHabit')}</h2>
        <form onSubmit={submit} className="grid grid-cols-4 gap-2">
          <div className="col-span-3">
            <Field label={t('life.habitName')} required error={nameError}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError('')
                }}
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
            <Field label={t('life.habitUnit')} optional>
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
