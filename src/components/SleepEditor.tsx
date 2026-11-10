import { useState } from 'react'
import Sheet from './Sheet'
import { Button, Field } from './ui'
import { DateField, TimeField } from './Pickers'
import { useStore } from '../store'
import { validNight } from '../lib/life'
import { todayStr } from '../lib/dates'
import type { SleepLog } from '../types'
import { useT } from '../i18n'

const dayOf = (iso: string) => iso.slice(0, 10)
const timeOf = (iso: string) => iso.slice(11, 16)
const nowTime = () => {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

/** Bottom panel for fixing one night: when I went to bed and when I got up. */
export default function SleepEditor({ log, onClose }: { log: SleepLog; onClose: () => void }) {
  const { t } = useT()
  const update = useStore((s) => s.update)
  const [bedDate, setBedDate] = useState(dayOf(log.bedtime))
  const [bedTime, setBedTime] = useState(timeOf(log.bedtime))
  // a night without a wake-up: the present moment is offered
  const [wakeDate, setWakeDate] = useState(log.wakeTime ? dayOf(log.wakeTime) : todayStr())
  const [wakeTime, setWakeTime] = useState(log.wakeTime ? timeOf(log.wakeTime) : nowTime())
  const [error, setError] = useState('')

  function save() {
    const bedtime = `${bedDate}T${bedTime}:00`
    const wake = `${wakeDate}T${wakeTime}:00`
    if (!validNight(bedtime, wake)) return setError(t('life.sleepInvalid'))
    update('sleep', log.id, { bedtime, wakeTime: wake, date: wakeDate })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={t('life.sleepEditTitle')}>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('life.bedDate')}>
            <DateField value={bedDate} onChange={(e) => setBedDate(e.target.value)} />
          </Field>
          <Field label={t('life.bedTimeField')}>
            <TimeField value={bedTime} onChange={setBedTime} />
          </Field>
          <Field label={t('life.wakeDate')}>
            <DateField value={wakeDate} onChange={(e) => setWakeDate(e.target.value)} />
          </Field>
          <Field label={t('life.wakeTimeField')} error={error}>
            <TimeField value={wakeTime} onChange={setWakeTime} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button onClick={save}>{t('common.save')}</Button>
          <Button variant="soft" onClick={onClose}>
            {t('common.giveUp')}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
