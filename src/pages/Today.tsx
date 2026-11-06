import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useStore, selectData } from '../store'
import { Badge, Button, Card, Input } from '../components/ui'
import { CATEGORY_META } from '../types'
import { formatLong, minToTime, timeToMin, todayStr } from '../lib/dates'
import {
  buildAlerts,
  currentAndNext,
  daySummary,
  occurrencesOn,
  withStatus,
  type Occurrence,
} from '../lib/schedule'
import { parseQuick } from '../lib/quickParse'
import { applyParsed } from '../lib/apply'
import { computeStreaks, rewardForDone, streakMessages } from '../lib/xp'
import { useToast } from '../lib/toast'
import ProgressCard from '../components/ProgressCard'
import ActivityForm from '../components/ActivityForm'
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
  const w = timeToMin(wake)
  let b = timeToMin(bed)
  if (b <= w) b += 1440
  const height = ((b - w) / 60) * PX_PER_HOUR
  const y = (min: number) => ((Math.min(Math.max(min, w), b) - w) / 60) * PX_PER_HOUR
  const hours: number[] = []
  for (let m = Math.ceil(w / 60) * 60; m <= b; m += 60) hours.push(m)
  return (
    <div className="relative ml-12" style={{ height }} aria-label="Vremenska linija dana">
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
  const data = useStore(useShallow(selectData))
  const store = useStore()
  const [now, setNow] = useState(new Date())
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
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
    if (!text.trim()) return
    setMsg(applyParsed(parseQuick(text, new Date()), store))
    setText('')
  }

  function mark(o: Occurrence, status: 'done' | 'skipped') {
    const a = data.activities.find((x) => x.id === o.activityId)
    if (!a) return
    store.update('activities', a.id, withStatus(a, today, status))
    if (status !== 'done') return
    const ev = rewardForDone(a, today, data.settings.ps5MinPerStudyHour)
    if (ev) store.award(ev)
    const streaks = streakMessages(computeStreaks(selectData(useStore.getState()), today))
    if (streaks.length) useToast.getState().push([...useToast.getState().messages, ...streaks])
  }
  function accept(o: Occurrence) {
    if (o.activityId) store.update('activities', o.activityId, { suggested: false })
  }

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">🌅 {formatLong(today)}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {data.settings.name ? `${data.settings.name}, ` : ''}
          {daySummary(occ)}
        </p>
      </header>

      {now.getDay() === 0 && now.getHours() >= 18 && (
        <Card className="mb-4">
          <p className="text-sm">
            📝 Nedelja uveče: vreme je za rezime nedelje i 3 saveta.{' '}
            <Link
              to="/ai?k=rezime"
              className="font-medium text-blue-700 underline dark:text-blue-300"
            >
              Napravi rezime
            </Link>
          </p>
        </Card>
      )}

      <ProgressCard />

      {alerts.length > 0 && (
        <Card className="mb-4 border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <h2 className="mb-2 font-semibold text-red-800 dark:text-red-200">⚠️ Pazi</h2>
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

      <form onSubmit={submit} className="mb-4 flex gap-2" role="search">
        <Input
          id="quick-input"
          aria-label="Brzi unos"
          placeholder="trening 18-19:30 · sutra učenje mata 2h · kafa 200 · legao 1:30"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setText('')
          }}
        />
        <Button type="submit">Dodaj</Button>
      </form>
      {msg && (
        <p role="status" className="mb-4 text-sm text-slate-700 dark:text-slate-300">
          {msg}
        </p>
      )}

      <Card className="mb-4">
        {current ? (
          <p>
            <strong>Sada:</strong> {CATEGORY_META[current.category].emoji} {current.title} (do{' '}
            {current.end})
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">Trenutno nema aktivnosti.</p>
        )}
        {next && (
          <p className="mt-1 text-sm">
            Sledeće: {next.title} u {next.start} (za {Math.floor(minutesToNext! / 60)} h{' '}
            {minutesToNext! % 60} min)
          </p>
        )}
      </Card>

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
          <h2 className="font-semibold">Obaveze</h2>
          <Button variant="soft" onClick={() => setEditing('new')}>
            + Nova aktivnost
          </Button>
        </div>
        {occ.length === 0 && (
          <p className="text-sm text-slate-500">Nema obaveza. Dodaj nešto gore. ☝️</p>
        )}
        <ul className="space-y-2">
          {occ.map((o) => (
            <li key={o.key} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-24 shrink-0 tabular-nums">
                {o.start}–{o.end}
              </span>
              <span className={o.status !== 'planned' ? 'line-through opacity-60' : ''}>
                {CATEGORY_META[o.category].emoji} {o.title}
              </span>
              {o.suggested && <Badge className="bg-amber-100 text-amber-800">predlog</Badge>}
              {o.status === 'done' && (
                <Badge className="bg-green-100 text-green-800">urađeno</Badge>
              )}
              {o.status === 'skipped' && (
                <Badge className="bg-slate-200 text-slate-700">preskočeno</Badge>
              )}
              {o.type === 'activity' && o.suggested && (
                <Button variant="soft" onClick={() => accept(o)}>
                  Prihvati
                </Button>
              )}
              {o.type === 'activity' && !o.suggested && o.status === 'planned' && (
                <span className="ml-auto flex gap-1">
                  <Button variant="soft" onClick={() => mark(o, 'done')}>
                    ✔ Urađeno
                  </Button>
                  <Button variant="ghost" onClick={() => mark(o, 'skipped')}>
                    Preskoči
                  </Button>
                </span>
              )}
              {o.type === 'activity' && o.activityId && (
                <Button
                  variant="ghost"
                  aria-label={`Izmeni ${o.title}`}
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
                  aria-label={`Obriši ${o.title}`}
                  onClick={() => store.remove('activities', o.activityId!)}
                >
                  ✕
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Vremenska linija</h2>
        <Timeline
          occ={occ}
          wake={data.settings.wakeTime}
          bed={data.settings.bedTime}
          nowMin={nowMin}
        />
      </Card>
    </>
  )
}
