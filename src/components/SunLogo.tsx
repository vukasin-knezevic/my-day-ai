/** The app's sun logo as inline SVG, so its parts can move on the opening screen. */
export default function SunLogo({
  size = 112,
  animated = false,
}: {
  size?: number
  animated?: boolean
}) {
  const a = (name: string) => (animated ? name : undefined)
  return (
    <svg
      width={size}
      height={size}
      viewBox="40 100 432 300"
      aria-hidden
      className={a('sun-glow')}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={26}
      strokeLinecap="round"
    >
      <defs>
        <clipPath id="sun-horizon">
          <rect x="0" y="0" width="512" height="331" />
        </clipPath>
      </defs>
      <g clipPath="url(#sun-horizon)">
        <path className={a('sun-arc')} d="M140 330a116 116 0 0 1 232 0" />
      </g>
      <g className={a('sun-rays')}>
        <path d="M256 130v38M126 190l27 27M386 190l-27 27M70 270l36 10M442 270l-36 10" />
      </g>
      <path d="M96 330h320" />
      <path d="M170 380h172" opacity=".55" />
    </svg>
  )
}

/** Shown while the saved data loads: the same dark screen and logo as the phone's start screen. */
export function BootScreen() {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020617]">
      <SunLogo size={112} />
    </div>
  )
}
