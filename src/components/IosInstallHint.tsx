import { currentEnv, shouldShowIosInstallHint, type Env } from '../lib/ios'
import { useStore } from '../store'
import { useT } from '../i18n'
import { Button } from './ui'

/** iPhone has no "Install" button: a short card explains "Share -> Add to Home Screen". Can be closed for good. */
export default function IosInstallHint({ env = currentEnv() }: { env?: Env }) {
  const { t } = useT()
  const dismissed = useStore((s) => s.settings.iosHintDismissed)
  const setSettings = useStore((s) => s.setSettings)
  if (!shouldShowIosInstallHint(env, dismissed)) return null
  return (
    <section
      aria-label={t('ios.title')}
      className="anim-pop mb-4 flex items-start gap-3 rounded-2xl border border-blue-300 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950"
    >
      <div className="flex-1">
        <p className="font-semibold">{t('ios.title')}</p>
        <p>{t('ios.body')}</p>
      </div>
      <Button variant="soft" onClick={() => setSettings({ iosHintDismissed: true })}>
        {t('common.close')}
      </Button>
    </section>
  )
}
