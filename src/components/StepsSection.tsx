import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../store'
import { tooltipProps } from './chart'
import { Card } from './ui'
import StepsRing from './StepsRing'
import { addDaysStr, formatShort } from '../lib/dates'
import { goalReached } from '../lib/health/steps'
import { friendlyOrigin } from '../lib/health/healthConnect'
import { isNative } from '../lib/platform'
import { useT } from '../i18n'
import { useToday } from '../lib/useToday'

/** Health -> Steps: the ring, the goal, the last 7 days, and where the watch is connected. */
export default function StepsSection() {
  const { t } = useT()
  const today = useToday()
  const days = useStore((s) => s.days)
  const goal = useStore((s) => s.settings.stepGoal)
  const connected = useStore((s) => s.settings.watchConnected)
  const origin = useStore((s) => s.settings.watchSource)
  const sourceName = origin ? friendlyOrigin(origin).name : t('watch.sourceAny')
  const steps = days[today]?.steps ?? 0
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysStr(today, i - 6)
    return { date: d, steps: days[d]?.steps ?? 0 }
  })
  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-4">
        <StepsRing steps={steps} goal={goal} />
        <div className="text-sm">
          <p className="text-lg font-bold tabular-nums">
            {steps}{' '}
            <span className="text-sm font-normal">{t('steps.of', { goal: String(goal) })}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            {goalReached(steps, goal) ? t('steps.reached') : t('steps.today')}
          </p>
        </div>
      </Card>
      {!connected && (
        <Card>
          <p className="text-sm">{isNative() ? t('steps.noData') : t('watch.nativeOnly')}</p>
        </Card>
      )}
      <Card>
        <h2 className="mb-2 font-semibold">{t('steps.chart7')}</h2>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatShort} fontSize={11} />
              <YAxis fontSize={11} width={40} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="steps" fill="#059669" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {isNative() && (
        <Card className="space-y-1">
          <h2 className="font-semibold">{t('watch.status')}</h2>
          <p className="text-sm">
            {connected ? t('watch.connected', { source: sourceName }) : t('watch.notConnected')}
          </p>
          <Link
            to="/settings"
            className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 underline dark:text-blue-300"
          >
            {t('watch.goSettings')}
          </Link>
        </Card>
      )}
    </div>
  )
}
