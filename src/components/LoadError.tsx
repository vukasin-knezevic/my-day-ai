import { useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { Button, Card } from './ui'

/** The saved data could not be read. Nothing is written in this state; the user can only try again. */
export default function LoadError() {
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  async function retry() {
    setBusy(true)
    useStore.setState({ hydrationError: false })
    await useStore.persist.rehydrate()
    setBusy(false)
  }
  return (
    <main role="alert" className="mx-auto max-w-md p-4 pt-10">
      <Card className="space-y-3">
        <h1 className="text-xl font-bold">{t('load.failTitle')}</h1>
        <p className="text-sm">{t('load.failBody')}</p>
        <Button onClick={() => void retry()} disabled={busy}>
          {t('load.retry')}
        </Button>
      </Card>
    </main>
  )
}
