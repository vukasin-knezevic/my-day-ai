import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { selectData, useStore } from '../store'
import { tooltipProps } from '../components/chart'
import { Card, PageTitle } from '../components/ui'
import { CATEGORY_META, type Category } from '../types'
import { formatHours, todayStr } from '../lib/dates'
import { overview, type Period } from '../lib/overview'
import { fmtMoney } from '../lib/life'
import { categoryLabel, currencyOf, expenseLabel } from '../lib/labels'
import { useT } from '../i18n'
import type { ExpenseCategory } from '../types'
import { levelFor } from '../lib/xp'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
      <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-slate-600 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

export default function Overview() {
  const { t } = useT()
  const currency = useStore((s) => currencyOf(s.settings))
  const data = useStore(useShallow(selectData))
  const [period, setPeriod] = useState<Period>('week')
  const o = overview(data, period, todayStr())
  const chart = (Object.keys(o.hours) as Category[]).map((c) => ({
    name: CATEGORY_META[c].emoji + ' ' + categoryLabel(c),
    sati: o.hours[c],
    color: CATEGORY_META[c].color,
  }))
  const lvl = levelFor(data.progress.xp)

  return (
    <>
      <PageTitle>{t('ov.title')}</PageTitle>
      <div role="tablist" className="mb-4 flex gap-2">
        {(['week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium ${period === p ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            {p === 'week' ? t('ov.week') : t('ov.month')}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label={t('ov.workouts')}
          value={`${o.workouts.done} / ${o.workouts.goal}`}
          sub={t('ov.goalPeriod')}
        />
        <Stat
          label={t('ov.study')}
          value={`${o.studyHours.actual} / ${o.studyHours.goal}`}
          sub={t('ov.studySub')}
        />
        <Stat
          label={t('ov.sleep')}
          value={o.avgSleep !== null ? `${o.avgSleep} h` : '—'}
          sub={t('ov.sleepSub', { goal: formatHours(data.settings.sleepGoalHours) })}
        />
        <Stat label={t('ov.spent')} value={fmtMoney(o.spent, currency)} />
        <Stat label={t('ov.xp')} value={String(o.xp)} sub={t('ov.level', { name: lvl.name })} />
        <Stat
          label={t('ov.streaks')}
          value={`${o.streaks.study}/${o.streaks.workout}/${o.streaks.sleep}/${o.streaks.habits}`}
          sub={t('ov.streaksSub')}
        />
      </div>

      <Card className="mb-4">
        <h2 className="mb-2 font-semibold">{t('ov.hours')}</h2>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={chart} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" width={120} fontSize={11} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="sati" name={t('ov.hoursUnit')} radius={4}>
                {chart.map((c) => (
                  <Cell key={c.name} fill={c.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 font-semibold">{t('ov.expenses')}</h2>
        <ul className="grid grid-cols-2 gap-1 text-sm">
          {Object.entries(o.spentByCategory).map(([k, v]) => (
            <li key={k}>
              {expenseLabel(k as ExpenseCategory)}: <strong>{fmtMoney(v, currency)}</strong>
            </li>
          ))}
        </ul>
      </Card>

      {period === 'month' && (
        <Card>
          <h2 className="mb-2 font-semibold">{t('ov.points')}</h2>
          {o.pointsBySubject.length === 0 && (
            <p className="text-sm text-slate-500">{t('ov.noSubjects')}</p>
          )}
          <ul className="space-y-1 text-sm">
            {o.pointsBySubject.map((p) => (
              <li key={p.name}>
                {p.name}: <strong>{p.earned}</strong> / {p.max}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
