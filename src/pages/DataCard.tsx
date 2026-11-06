import { useState } from 'react'
import { selectData, useStore } from '../store'
import { Button, Card } from '../components/ui'
import KeyScope from '../components/KeyScope'
import { exportJson, importJson } from '../lib/dataIO'
import { downloadText } from '../lib/ics'
import type { AppData } from '../types'

/** Export / import / delete everything. Confirmations are inside the page (no confirm() popups). */
export default function DataCard() {
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [pending, setPending] = useState<AppData | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const current = () => selectData(useStore.getState())

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportJson(current()))
      setMsg('📋 JSON je kopiran.')
    } catch {
      setErr('Kopiranje nije uspelo, koristi „Preuzmi fajl".')
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
    setMsg('✅ Podaci su uvezeni.')
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">💾 Podaci</h2>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Izvoz ne sadrži API ključ. Sve je sačuvano samo na ovom uređaju.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" onClick={copy}>
          Kopiraj JSON
        </Button>
        <Button
          variant="soft"
          onClick={() =>
            downloadText('my-day-ai-backup.json', exportJson(current()), 'application/json')
          }
        >
          Preuzmi fajl
        </Button>
      </div>
      <label className="block text-sm font-medium" htmlFor="import-json">
        Uvoz: nalepi JSON
      </label>
      <textarea
        id="import-json"
        className="min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
      />
      <Button variant="soft" onClick={check}>
        Proveri uvoz
      </Button>
      {pending && (
        <KeyScope
          focusOnMount
          onEnter={applyImport}
          onEscape={() => setPending(null)}
          role="alertdialog"
          aria-label="Potvrda uvoza"
          className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900"
        >
          Uvoz će <strong>zameniti sve trenutne podatke</strong> ({pending.subjects.length}{' '}
          predmeta, {pending.activities.length} aktivnosti, {pending.workouts.length} treninga).
          Nastaviti?
          <div className="mt-2 flex gap-2">
            <Button variant="danger" onClick={applyImport}>
              Da, uvezi
            </Button>
            <Button variant="soft" onClick={() => setPending(null)}>
              Odustani
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
          Obriši sve podatke
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
          aria-label="Potvrda brisanja"
          className="rounded-xl bg-red-100 p-3 text-sm text-red-900"
        >
          Ovo briše <strong>sve</strong> (predmete, treninge, troškove, XP…) i ne može da se vrati.
          Sigurno?
          <div className="mt-2 flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                useStore.getState().resetAll()
                setConfirmDelete(false)
              }}
            >
              Da, obriši sve
            </Button>
            <Button variant="soft" onClick={() => setConfirmDelete(false)}>
              Odustani
            </Button>
          </div>
        </KeyScope>
      )}
    </Card>
  )
}
