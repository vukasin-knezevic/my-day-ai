import { useState } from 'react'
import { selectData, useStore } from '../store'
import { Button, Card } from '../components/ui'
import KeyScope from '../components/KeyScope'
import { exportJson, importJson } from '../lib/dataIO'
import { downloadText } from '../lib/ics'
import type { AppData } from '../types'
import { useT } from '../i18n'
import Rich from '../i18n/Rich'

/** Export / import / delete everything. Confirmations are inside the page (no confirm() popups). */
export default function DataCard() {
  const { t } = useT()
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [pending, setPending] = useState<AppData | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const current = () => selectData(useStore.getState())

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportJson(current()))
      setMsg(t('data.copied'))
    } catch {
      setErr(t('data.copyFail'))
    }
  }
  function check() {
    setMsg('')
    const r = importJson(paste)
    if (!r.ok) {
      setErr(r.message)
      setPending(null)
    } else {
      setErr('')
      setPending(r.data)
    }
  }
  function applyImport() {
    if (!pending) return
    const keep = useStore.getState().settings.apiKey
    useStore.getState().importAll({
      ...pending,
      settings: { ...pending.settings, apiKey: pending.settings.apiKey || keep },
    })
    setPending(null)
    setPaste('')
    setMsg(t('data.imported'))
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{t('data.title')}</h2>
      <p className="text-xs text-slate-600 dark:text-slate-400">{t('data.note')}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" onClick={copy}>
          {t('data.copy')}
        </Button>
        <Button
          variant="soft"
          onClick={() =>
            downloadText('my-day-ai-backup.json', exportJson(current()), 'application/json')
          }
        >
          {t('data.download')}
        </Button>
      </div>
      <label className="block text-sm font-medium" htmlFor="import-json">
        {t('data.importLabel')}
      </label>
      <textarea
        id="import-json"
        className="min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
      />
      <Button variant="soft" onClick={check}>
        {t('data.check')}
      </Button>
      {pending && (
        <KeyScope
          focusOnMount
          onEnter={applyImport}
          onEscape={() => setPending(null)}
          role="alertdialog"
          aria-label={t('data.importDialog')}
          className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900"
        >
          <Rich
            text={t('data.importWarn', {
              subjects: pending.subjects.length,
              activities: pending.activities.length,
              workouts: pending.workouts.length,
            })}
          />
          <div className="mt-2 flex gap-2">
            <Button variant="danger" onClick={applyImport}>
              {t('data.yesImport')}
            </Button>
            <Button variant="soft" onClick={() => setPending(null)}>
              {t('common.giveUp')}
            </Button>
          </div>
        </KeyScope>
      )}
      {msg && (
        <p role="status" className="text-sm">
          {msg}
        </p>
      )}
      {err && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {err}
        </p>
      )}

      <hr className="border-slate-200 dark:border-slate-800" />
      {!confirmDelete ? (
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          {t('data.deleteAll')}
        </Button>
      ) : (
        <KeyScope
          focusOnMount
          onEnter={() => {
            useStore.getState().resetAll()
            setConfirmDelete(false)
          }}
          onEscape={() => setConfirmDelete(false)}
          role="alertdialog"
          aria-label={t('data.deleteDialog')}
          className="rounded-xl bg-red-100 p-3 text-sm text-red-900"
        >
          <Rich text={t('data.deleteWarn')} />
          <div className="mt-2 flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                useStore.getState().resetAll()
                setConfirmDelete(false)
              }}
            >
              {t('data.yesDelete')}
            </Button>
            <Button variant="soft" onClick={() => setConfirmDelete(false)}>
              {t('common.giveUp')}
            </Button>
          </div>
        </KeyScope>
      )}
    </Card>
  )
}
