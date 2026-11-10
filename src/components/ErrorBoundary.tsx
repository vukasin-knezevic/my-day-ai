import { Component, type ErrorInfo, type ReactNode } from 'react'
import { selectData, useStore } from '../store'
import { shareBackup } from '../lib/backup'
import { flushStorage } from '../lib/storage'
import { t } from '../i18n'
import { Button, Card } from './ui'

interface State {
  failed: boolean
  /** A copy of the data was saved in this state: only then may everything be deleted. */
  saved: boolean
}

/**
 * A crash in one screen must not end in a blank page: the data is safe and can still be saved.
 * If the saved data itself causes the crash, reloading repeats it. The way out is to save a copy
 * and then start over with empty data.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, saved: false }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed', error, info.componentStack)
  }

  save = async () => {
    const result = await shareBackup(selectData(useStore.getState()))
    if (result !== 'cancelled') this.setState({ saved: true })
  }

  wipe = async () => {
    useStore.getState().resetAll()
    await flushStorage()
    location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    const { saved } = this.state
    return (
      <main className="mx-auto max-w-md p-4 pt-10">
        <Card className="space-y-3">
          <h1 className="text-xl font-bold">{t('err.title')}</h1>
          <p className="text-sm">{t('err.body')}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => location.reload()}>{t('err.reload')}</Button>
            <Button variant="soft" onClick={() => void this.save()}>
              {t('data.download')}
            </Button>
          </div>
          <hr className="border-slate-200 dark:border-slate-800" />
          <p role="status" className="text-xs text-slate-600 dark:text-slate-400">
            {saved ? t('err.copySaved') : t('err.wipeHint')}
          </p>
          <Button variant="danger" disabled={!saved} onClick={() => void this.wipe()}>
            {t('err.wipe')}
          </Button>
        </Card>
      </main>
    )
  }
}
