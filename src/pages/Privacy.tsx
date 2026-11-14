import { Card, PageTitle } from '../components/ui'
import { useT } from '../i18n'

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
      </Card>
    </>
  )
}
