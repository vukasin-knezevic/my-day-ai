import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Card, PageTitle } from '../components/ui'
import { badges, records, surpriseBadges } from '../lib/achievements'
import { todayStr } from '../lib/dates'
import { useT } from '../i18n'

export default function Achievements() {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const list = badges(data, todayStr())
  const won = surpriseBadges(data)
  const recs = records(data)
  return (
    <>
      <PageTitle>{t('ach.title')}</PageTitle>
      <div className="space-y-4">
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((b) => (
            <li key={b.id}>
              <Card className={b.earned ? '' : 'opacity-70'}>
                <p className="font-semibold">
                  <span aria-hidden>{b.earned ? b.icon : '🔒'}</span> {t(b.name)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t(b.desc)}</p>
                {!b.earned && b.progress && (
                  <p className="mt-1 text-xs tabular-nums">
                    {b.progress.have} / {b.progress.need}
                  </p>
                )}
                {b.earned && (
                  <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                    ✓ {t('ach.earned')}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
        {won.length > 0 && (
          <Card>
            <h2 className="mb-2 font-semibold">🎁 {t('ach.surprises')}</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {won.map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  className="rounded-full bg-amber-100 px-3 py-1 text-amber-900"
                >
                  {n}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <h2 className="mb-2 font-semibold">💪 {t('ach.records')}</h2>
          {recs.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('ach.recordsEmpty')}</p>
          ) : (
            <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {recs.map((r) => (
                <li key={r.exercise} className="flex justify-between py-2">
                  <span className="user-text">{r.exercise}</span>
                  <span className="font-semibold tabular-nums">{r.kg} kg</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
