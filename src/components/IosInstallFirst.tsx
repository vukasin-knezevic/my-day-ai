import { useT } from '../i18n'
import { Button, Card } from './ui'

/**
 * iPhone, opened in Safari, before the first setup: install first. What is typed in Safari stays in
 * Safari (the installed app has its own storage), and Safari deletes it after a week without use.
 */
export default function IosInstallFirst({ onContinue }: { onContinue: () => void }) {
  const { t } = useT()
  return (
    <main className="mx-auto max-w-md p-4 pt-10">
      <Card className="space-y-3">
        <h1 className="text-xl font-bold">{t('ios.first.title')}</h1>
        <p className="text-sm">{t('ios.first.body')}</p>
        <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">{t('ios.first.warn')}</p>
        <Button variant="soft" onClick={onContinue}>
          {t('ios.first.continue')}
        </Button>
      </Card>
    </main>
  )
}
