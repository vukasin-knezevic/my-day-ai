import { Link } from 'react-router-dom'
import { Card, PageTitle } from '../components/ui'
import { EXTRA } from '../components/Layout'
import { useT } from '../i18n'

export default function More() {
  const { t } = useT()
  return (
    <>
      <PageTitle>{t('nav.more')}</PageTitle>
      <div className="grid gap-3">
        {EXTRA.map((e) => (
          <Link key={e.to} to={e.to}>
            <Card className="flex items-center gap-3 text-lg font-medium">
              <span aria-hidden>{e.icon}</span> {t(e.label)}
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
