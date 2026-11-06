import { useState } from 'react'
import { useStore } from '../store'
import { Button, Card, Field, Input, Select } from './ui'
import KeyScope from './KeyScope'
import { CATEGORY_META, type Activity, type Category, type Recurrence } from '../types'
import { useT } from '../i18n'
import { categoryLabel, recurrenceLabel } from '../lib/labels'
import { timeToMin } from '../lib/dates'

const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekdays', 'weekly']

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
  const { t } = useT()
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
    if (!f.title.trim()) return setError(t('act.errTitle'))
    if (!f.date) return setError(t('act.errDate'))
    if (timeToMin(f.end) <= timeToMin(f.start)) return setError(t('act.errEnd'))
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
    <KeyScope onEnter={save} onEscape={onClose} role="dialog" aria-label={t('act.dialog')}>
      <Card className="mb-4 border-blue-300 dark:border-blue-800">
        <h2 className="mb-3 font-semibold">{initial ? t('act.edit') : t('act.new')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label={t('act.name')}>
              <Input
                autoFocus
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t('act.category')}>
            <Select
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value as Category })}
            >
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].emoji} {categoryLabel(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('act.recurrence')}>
            <Select
              value={f.recurrence}
              onChange={(e) => setF({ ...f, recurrence: e.target.value as Recurrence })}
            >
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {recurrenceLabel(r)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.recurrence === 'none' ? t('act.date') : t('act.starts')}>
            <Input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('act.start')}>
              <Input
                type="time"
                value={f.start}
                onChange={(e) => setF({ ...f, start: e.target.value })}
              />
            </Field>
            <Field label={t('act.end')}>
              <Input
                type="time"
                value={f.end}
                onChange={(e) => setF({ ...f, end: e.target.value })}
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label={t('act.note')}>
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
            {t('common.cancel')}
          </Button>
          <Button onClick={save}>{initial ? t('act.saveChanges') : t('common.add')}</Button>
        </div>
      </Card>
    </KeyScope>
  )
}
