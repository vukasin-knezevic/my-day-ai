import { ringFraction } from '../lib/health/steps'
import { useT } from '../i18n'

/** The steps ring: same look as the week ring. The size is fixed, so nothing jumps while data loads. */
export default function StepsRing({ steps, goal }: { steps: number; goal: number }) {
  const { t } = useT()
  const R = 26
  const C = 2 * Math.PI * R
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      role="img"
      aria-label={t('steps.aria', { steps: String(steps), goal: String(goal) })}
      className="shrink-0"
    >
      <circle
        cx="32"
        cy="32"
        r={R}
        fill="none"
        strokeWidth="7"
        className="stroke-slate-200 dark:stroke-slate-800"
      />
      <circle
        cx="32"
        cy="32"
        r={R}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className="stroke-emerald-600 transition-[stroke-dashoffset] duration-500"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - ringFraction(steps, goal))}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="36" textAnchor="middle" className="fill-current text-[11px] font-bold">
        {Math.round(ringFraction(steps, goal) * 100)}%
      </text>
    </svg>
  )
}
