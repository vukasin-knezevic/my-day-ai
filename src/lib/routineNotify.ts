// The "Done" button of the morning notification: ticks the next step and shows the one after it.
// Android shows buttons in notifications; an iPhone web app does not (the card in the app does the same).
import { useEffect } from 'react'
import { selectData, useStore } from '../store'
import { todayStr } from './dates'
import { routineSteps, tickedOn } from './routine'
import { toggleRoutineStep } from './routineFlow'
import { showNotification } from './useReminders'
import { t } from '../i18n'
import type { NotificationMessage } from './swNotifications'

/** A touch on the "Done" button: tick the next open step, then offer the one after it. */
export async function handleRoutineAction(tag: string, action: string, now = new Date()) {
  const today = todayStr(now)
  if (!tag.startsWith('routine-') || action !== 'done') return false
  const st = useStore.getState()
  const steps = routineSteps(st.settings)
  const open = steps.map((_, i) => i).filter((i) => !tickedOn(selectData(st), today).includes(i))
  if (!open.length) return true
  toggleRoutineStep(open[0], today, now)
  const left = open.slice(1)
  if (left.length) {
    const step = steps[left[0]]
    await showNotification(
      `${step.emoji} ${step.text}`,
      t('rem.routine.next', { n: left.length }),
      {
        tag: `routine-${today}-next`,
        actions: [{ action: 'done', title: t('rem.routine.done') }],
      },
    )
  }
  return true
}

/** Listens for touches on notifications (from the service worker, or from the address when the app was closed). */
export function useNotificationActions() {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const m = e.data as Partial<NotificationMessage> | null
      if (m?.type === 'notification-click' && m.tag !== undefined)
        void handleRoutineAction(m.tag, m.action ?? '')
    }
    navigator.serviceWorker?.addEventListener?.('message', onMessage)
    // the app was closed: the service worker opened it with the action in the address
    const q = new URLSearchParams(window.location.search)
    const action = q.get('n-action')
    const tag = q.get('n-tag')
    if (action && tag) {
      void handleRoutineAction(tag, action)
      history.replaceState(null, '', window.location.pathname + window.location.hash)
    }
    return () => navigator.serviceWorker?.removeEventListener?.('message', onMessage)
  }, [])
}
