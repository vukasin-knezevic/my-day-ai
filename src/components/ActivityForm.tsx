import { useState } from 'react'
import { useStore } from '../store'
import { Button, Card, Field, Input, Select } from './ui'
import KeyScope from './KeyScope'
import { CATEGORY_META, type Activity, type Category, type Recurrence } from '../types'
import { timeToMin } from '../lib/dates'

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: 'Jednokratno',
  daily: 'Svaki dan',
  weekdays: 'Radnim danima (pon–pet)',
  weekly: 'Jednom nedeljno (istog dana)',
}

/** Add a new activity or edit an existing one. Enter saves, Escape closes. */
export default function ActivityForm({
  initial,
  defaultDate,
  onClose,
}: {
  initial?: Activity
  defaultDate: string
  onClose: () => void
}) {
  const add = useStore((s) => s.add)
  const update = useStore((s) => s.update)
  const [f, setF] = useState({
    title: initial?.title ?? '',
    category: initial?.category ?? ('study' as Category),
    date: initial?.date ?? defaultDate,
    start: initial?.start ?? '18:00',
    end: initial?.end ?? '19:00',
    recurrence: initial?.recurrence ?? ('none' as Recurrence),
    note: initial?.note ?? '',
  })
  const [error, setError] = useState('')

  function save() {
    if (!f.title.trim()) return setError('Upiši naziv aktivnosti.')
    if (!f.date) return setError('Izaberi datum.')
    if (timeToMin(f.end) <= timeToMin(f.start)) return setError('Kraj mora biti posle početka.')
    const patch = {
      title: f.title.trim(),
      category: f.category,
      date: f.date,
      start: f.start,
      end: f.end,
      recurrence: f.recurrence,
      note: f.note.trim() || undefined,
    }
    if (initial) update('activities', initial.id, { ...patch, suggested: false })
    else add('activities', { ...patch, status: 'planned', source: 'me' })
    onClose()
  }

  return (
    <KeyScope onEnter={save} onEscape={onClose} role="dialog" aria-label="Aktivnost">
      <Card className="mb-4 border-blue-300 dark:border-blue-800">
        <h2 className="mb-3 font-semibold">{initial ? 'Izmeni aktivnost' : 'Nova aktivnost'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Naziv">
              <Input
                autoFocus
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Kategorija">
            <Select
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value as Category })}
            >
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ponavljanje">
            <Select
              value={f.recurrence}
              onChange={(e) => setF({ ...f, recurrence: e.target.value as Recurrence })}
            >
              {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.recurrence === 'none' ? 'Datum' : 'Počinje'}>
            <Input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Početak">
              <Input
                type="time"
                value={f.start}
                onChange={(e) => setF({ ...f, start: e.target.value })}
              />
            </Field>
            <Field label="Kraj">
              <Input
                type="time"
                value={f.end}
                onChange={(e) => setF({ ...f, end: e.target.value })}
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Beleška (opciono)">
              <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
            </Field>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="soft" onClick={onClose}>
            Otkaži
          </Button>
          <Button onClick={save}>{initial ? 'Sačuvaj izmene' : 'Dodaj'}</Button>
        </div>
      </Card>
    </KeyScope>
  )
}
