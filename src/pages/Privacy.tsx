import { Card, PageTitle } from '../components/ui'
import { useT } from '../i18n'

export const POLICY_URL = 'https://vukasin-knezevic.github.io/my-day-ai/privacy/'

/** What the app reads from Health Connect (Google Play and Health Connect both ask for this screen). */
export default function Privacy() {
  const { t } = useT()
  return (
    <>
      <PageTitle>{t('privacy.title')}</PageTitle>
      <Card className="space-y-3 text-sm">
        <p>{t('privacy.read')}</p>
        <p>{t('privacy.local')}</p>
        <p>{t('privacy.revoke')}</p>
        <a
          href={POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-medium text-blue-700 underline dark:text-blue-300"
        >
          {t('privacy.web')}
        </a>
      </Card>
    </>
  )
}
