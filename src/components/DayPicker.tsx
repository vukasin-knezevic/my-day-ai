import {
  addDaysStr,
  formatLong,
  fromDateStr,
  weekDates,
  weekdayName,
  weekdayOf,
} from '../lib/dates'
import { useT } from '../i18n'

/** "Juče" / "Danas" / "Sutra" for the days around today, '' for the rest. */
export function relativeDayLabel(
  day: string,
  today: string,
  t: ReturnType<typeof useT>['t'],
): string {
  if (day === today) return t('today.dayToday')
  if (day === addDaysStr(today, -1)) return t('today.dayYesterday')
  if (day === addDaysStr(today, 1)) return t('today.dayTomorrow')
  return ''
}

const arrowCls =
  'grid size-11 shrink-0 place-items-center rounded-full text-xl text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800'

/** ‹ day › with the week of the chosen day underneath. Everything on the Today screen follows it. */
export default function DayPicker({
  day,
  today,
  onChange,
}: {
  day: string
  today: string
  onChange: (day: string) => void
}) {
  const { t } = useT()
  const rel = relativeDayLabel(day, today, t)
  return (
    <header className="mb-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={arrowCls}
          aria-label={t('today.prevDay')}
          onClick={() => onChange(addDaysStr(day, -1))}
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-xl font-bold" aria-live="polite">
            {formatLong(day)}
          </h1>
          {day === today ? (
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{rel}</p>
          ) : (
            <button
              type="button"
              className="min-h-6 text-xs font-semibold text-blue-700 underline dark:text-blue-300"
              onClick={() => onChange(today)}
            >
              {rel ? `${rel} · ` : ''}
              {t('today.backToToday')}
            </button>
          )}
        </div>
        <button
          type="button"
          className={arrowCls}
          aria-label={t('today.nextDay')}
          onClick={() => onChange(addDaysStr(day, 1))}
        >
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1" role="group" aria-label={t('today.pickDay')}>
        {weekDates(day).map((d) => {
          const selected = d === day
          return (
            <button
              key={d}
              type="button"
              aria-pressed={selected}
              aria-label={formatLong(d)}
              onClick={() => onChange(d)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-xl text-xs ${
                selected
                  ? 'bg-blue-600 font-semibold text-white'
                  : d === today
                    ? 'border border-blue-400 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <span aria-hidden="true">{weekdayName(weekdayOf(d)).slice(0, 3)}</span>
              <span aria-hidden="true" className="text-sm tabular-nums">
                {fromDateStr(d).getDate()}
              </span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
