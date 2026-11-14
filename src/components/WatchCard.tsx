import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store'
import { Button, Card, Field, Select } from './ui'
import { useT } from '../i18n'
import {
  getHealthSource,
  type Availability,
  type DataOrigin,
  type PermissionState,
} from '../lib/health'
import { friendlyOrigin } from '../lib/health/healthConnect'
import { syncHealth } from '../lib/health/sync'
import { useToast } from '../lib/toast'

type View = 'loading' | 'unavailable' | 'update' | 'not-connected' | 'connected' | 'revoked'

/** Settings -> "Connect watch" (Android app only): permissions, source, sync, disconnect. */
export default function WatchCard() {
  const { t } = useT()
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const [view, setView] = useState<View>('loading')
  const [origins, setOrigins] = useState<DataOrigin[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const source = getHealthSource()

  const refresh = useCallback(async () => {
    const a = await source.isAvailable()
    const avail: Availability | null = a.ok ? a.value : null
    if (avail !== 'available')
      return setView(avail === 'update-required' ? 'update' : 'unavailable')
    const p = await source.getPermissionState()
    const perms: PermissionState | null = p.ok ? p.value : null
    const all = !!perms && perms.steps && perms.sleep
    if (!useStore.getState().settings.watchConnected) return setView('not-connected')
    if (!all) return setView('revoked')
    setView('connected')
    const o = await source.listDataOrigins()
    if (o.ok) setOrigins(o.value)
  }, [source])

  useEffect(() => {
    void refresh()
    // coming back from the Health Connect screen
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  const connect = async () => {
    setBusy(true)
    setError('')
    const r = await source.requestPermissions()
    if (r.ok && r.value.steps && r.value.sleep) {
      setSettings({ watchConnected: true })
      await syncHealth(source, { force: true })
    } else setError(t('watch.revoked'))
    await refresh()
    setBusy(false)
  }

  const syncNow = async () => {
    setBusy(true)
    setError('')
    const r = await syncHealth(source, { force: true })
    if (r.ok) useToast.getState().push([t('watch.synced', { n: String(r.addedNights) })])
    else setError(t('watch.syncFail'))
    setBusy(false)
  }

  const openHc = () => void source.openSettings()
  const sourceName = settings.watchSource
    ? friendlyOrigin(settings.watchSource).name
    : t('watch.sourceAny')
  const last = settings.watchLastSync
    ? new Date(settings.watchLastSync).toLocaleString([], {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : ''
  const choices =
    origins.some((o) => o.packageName === settings.watchSource) || !settings.watchSource
      ? origins
      : [friendlyOrigin(settings.watchSource), ...origins]

  return (
    <Card className="space-y-3" data-testid="watch-card">
      <h2 className="font-semibold">{t('watch.title')}</h2>
      <p className="text-sm">{t('watch.intro')}</p>
      <p role="status" className="text-sm font-medium">
        {view === 'loading' && '…'}
        {view === 'unavailable' && t('watch.unavailable')}
        {view === 'update' && t('watch.update')}
        {view === 'not-connected' && t('watch.notConnected')}
        {view === 'revoked' && t('watch.revoked')}
        {view === 'connected' && t('watch.connected', { source: sourceName })}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {(view === 'unavailable' || view === 'update' || view === 'revoked') && (
        <Button variant="soft" onClick={openHc}>
          {t('watch.openSettings')}
        </Button>
      )}
      {(view === 'not-connected' || view === 'revoked') && (
        <Button disabled={busy} onClick={connect}>
          {t('watch.connect')}
        </Button>
      )}
      {view === 'connected' && (
        <>
          <Field label={t('watch.source')}>
            <Select
              value={settings.watchSource}
              onChange={(e) => setSettings({ watchSource: e.target.value })}
            >
              <option value="">{t('watch.sourceAny')}</option>
              {choices.map((o) => (
                <option key={o.packageName} value={o.packageName}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {last ? t('watch.last', { time: last }) : t('watch.never')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={syncNow}>
              {busy ? t('watch.syncing') : t('watch.sync')}
            </Button>
            <Button variant="soft" onClick={openHc}>
              {t('watch.openSettings')}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                setSettings({ watchConnected: false, watchSource: '', watchLastSync: '' })
              }
            >
              {t('watch.disconnect')}
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
