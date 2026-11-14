import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { Card } from './ui'
import StepsRing from './StepsRing'
import { isNative } from '../lib/platform'
import { useT } from '../i18n'

/** Today: the short steps card (Android app, watch connected). It links into Health -> Steps. */
export default function TodaySteps({ today }: { today: string }) {
  const { t } = useT()
  const connected = useStore((s) => s.settings.watchConnected)
  const goal = useStore((s) => s.settings.stepGoal)
  const steps = useStore((s) => s.days[today]?.steps ?? 0)
  if (!isNative() || !connected) return null
  return (
    <Card className="mb-4 flex items-center gap-4">
      <StepsRing steps={steps} goal={goal} />
      <div className="text-sm">
        <p className="font-semibold tabular-nums">
          👟 {steps} {t('steps.of', { goal: String(goal) })}
        </p>
        <Link
          to="/health?tab=koraci"
          className="inline-flex min-h-11 items-center text-blue-700 underline dark:text-blue-300"
        >
          {t('steps.open')}
        </Link>
      </div>
    </Card>
  )
}
