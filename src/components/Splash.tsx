import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { addressName } from '../lib/address'
import { todayStr } from '../lib/dates'
import { activeDays, mainStreak } from '../lib/streak'
import { reducedMotion } from '../lib/effects'
import { useToast } from '../lib/toast'
import { useT } from '../i18n'
import SunLogo from './SunLogo'

/** Once per opening of the app: logo, a greeting and the streak, about a second. A tap skips it. */
let shownThisOpening = false
export const resetSplash = () => {
  shownThisOpening = false
}

/** Automated browsers (tests) and the test runner skip it: it would only be in the way. */
const skipEntirely = () =>
  import.meta.env.MODE === 'test' ||
  (typeof navigator !== 'undefined' && navigator.webdriver === true)

export default function Splash({ force = false }: { force?: boolean }) {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const setSettings = useStore((s) => s.setSettings)
  const [visible, setVisible] = useState(() => {
    if (!force && (shownThisOpening || skipEntirely())) return false
    shownThisOpening = true
    return true
  })
  const today = todayStr()
  const streak = mainStreak(activeDays(data), today)
  const name = addressName(data.settings)

  useEffect(() => {
    if (!visible) return
    const id = setTimeout(() => setVisible(false), reducedMotion() ? 500 : 1900)
    return () => clearTimeout(id)
  }, [visible])

  // "A save kept your streak": said once, the next time the app is opened
  const seen = data.settings.streakSavesSeen
  useEffect(() => {
    if (seen < 0) setSettings({ streakSavesSeen: streak.spent })
    else if (streak.spent > seen) {
      useToast.getState().push([t('streak.saved', { n: Math.max(streak.current, 1) })])
      setSettings({ streakSavesSeen: streak.spent })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, streak.spent, streak.current, setSettings])

  if (!visible) return null
  return (
    <div
      role="presentation"
      data-testid="splash"
      onClick={() => setVisible(false)}
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-[#020617] text-white ${
        reducedMotion() ? '' : 'anim-splash'
      }`}
    >
      <SunLogo size={112} animated={!reducedMotion()} />
      <p className={`text-2xl font-bold ${reducedMotion() ? '' : 'splash-text'}`}>
        {name ? t('splash.hello', { name }) : t('splash.helloNoName')}
      </p>
      {streak.current > 0 && (
        <p className={`text-lg ${reducedMotion() ? '' : 'splash-streak'}`}>
          🔥 {t('streak.days', { n: streak.current })}
        </p>
      )}
    </div>
  )
}
