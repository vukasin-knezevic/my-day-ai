import { Component, type ErrorInfo, type ReactNode } from 'react'
import { selectData, useStore } from '../store'
import { exportJson } from '../lib/dataIO'
import { downloadText } from '../lib/ics'
import { t } from '../i18n'
import { Button, Card } from './ui'

/** A crash in one screen must not end in a blank page: the data is safe and can still be saved. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="mx-auto max-w-md p-4 pt-10">
        <Card className="space-y-3">
          <h1 className="text-xl font-bold">{t('err.title')}</h1>
          <p className="text-sm">{t('err.body')}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => location.reload()}>{t('err.reload')}</Button>
            <Button
              variant="soft"
              onClick={() =>
                downloadText(
                  'my-day-ai-backup.json',
                  exportJson(selectData(useStore.getState())),
                  'application/json',
                )
              }
            >
              {t('data.download')}
            </Button>
          </div>
        </Card>
      </main>
    )
  }
}
