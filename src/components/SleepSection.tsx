import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, selectData } from '../store'
import { tooltipProps } from './chart'
import { Button, Card } from './ui'
import SleepEditor from './SleepEditor'
import type { SleepLog } from '../types'
import { addDaysStr, formatHours, formatShort, formatTimeOfDay } from '../lib/dates'
import { applyParsed } from '../lib/apply'
import { occurrencesOn } from '../lib/schedule'
import { deleteWithUndo } from '../lib/undo'
import { useT } from '../i18n'
import { useToday } from '../lib/useToday'
import Rich from '../i18n/Rich'
import { avgSleep, openSleep, sleepHours, suggestBedtime } from '../lib/life'

/** The sleep section (lives in Health): bed/wake buttons, last night, log, 7-day chart. */
export default function SleepSection() {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const store = useStore()
  const today = useToday()
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  // the night in progress; a "went to bed" from days ago (a forgotten "woke up") does not count
  const open = openSleep(data.sleep, `${today}T${hhmm}:00`)
  const [editing, setEditing] = useState<SleepLog | null>(null)
  const recent = [...data.sleep].sort((a, b) => b.bedtime.localeCompare(a.bedtime)).slice(0, 7)
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
            {t('life.sleepingSince', { time: formatTimeOfDay(open.bedtime.slice(11, 16)) })}
          </p>
        )}
        <p className="mt-2 text-sm">
          <Rich
            text={t('life.avg', {
              avg: avg === null ? '—' : formatHours(avg),
              goal: formatHours(data.settings.sleepGoalHours),
            })}
          />
        </p>
        <p className="text-sm">
          <Rich text={t('life.suggestion', { time: suggest, first })} />
        </p>
      </Card>
      {last && <Quality log={last} />}
      {recent.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">{t('life.sleepLog')}</h2>
          <ul className="space-y-1 text-sm">
            {recent.map((s) => {
              const h = sleepHours(s)
              const date = formatShort(s.date)
              return (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-slate-600 dark:text-slate-400">{date}</span>
                  <span className="min-w-0 flex-1 tabular-nums">
                    {formatTimeOfDay(s.bedtime.slice(11, 16))} →{' '}
                    {s.wakeTime ? formatTimeOfDay(s.wakeTime.slice(11, 16)) : '…'}
                    <span className="text-slate-600 dark:text-slate-400">
                      {' · '}
                      {s.wakeTime ? (h === null ? '—' : formatHours(h)) : t('life.sleepOpen')}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    aria-label={t('life.sleepEdit', { date })}
                    onClick={() => setEditing(s)}
                  >
                    ✎
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={t('life.sleepDelete', { date })}
                    onClick={() => deleteWithUndo(() => store.remove('sleep', s.id))}
                  >
                    ✕
                  </Button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
      {editing && <SleepEditor key={editing.id} log={editing} onClose={() => setEditing(null)} />}
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
        {t('life.lastSleep', {
          date: formatShort(log.date),
          d: sleepHours(log) === null ? '—' : formatHours(sleepHours(log)!),
        })}
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
