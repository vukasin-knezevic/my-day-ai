import { useEffect } from 'react'
import { selectData, useStore } from '../store'
import { dueReminders } from './reminders'
import { addDaysStr, todayStr } from './dates'

export const notificationsSupported = () => typeof Notification !== 'undefined'

/** Asks the browser for permission. Returns true if granted. */
export async function requestNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export interface NotifyOptions {
  /** One notification per tag: the same reminder shown again replaces itself instead of piling up. */
  tag?: string
  /** Buttons inside the notification (Android; iPhone shows none). */
  actions?: { action: string; title: string }[]
  /** Stays until the user reacts (where the system supports it). */
  requireInteraction?: boolean
}

/**
 * Shows one notification. Chrome on Android forbids `new Notification(...)`, so the service worker
 * shows it; the constructor is only the fallback (laptops, or no service worker). Returns true if shown.
 */
export async function showNotification(
  title: string,
  body: string,
  opts: NotifyOptions = {},
): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const base = import.meta.env.BASE_URL
  const options = {
    body,
    // the large picture next to the text, and the small one-colour one for the status bar
    icon: `${base}icon-192.png`,
    badge: `${base}badge-96.png`,
    tag: opts.tag,
    requireInteraction: opts.requireInteraction,
  }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        ...options,
        actions: opts.actions,
      } as NotificationOptions)
      return true
    }
  } catch {
    /* fall through to the constructor */
  }
  try {
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}

const SENT_KEY = 'my-day-ai-sent'

/**
 * Reminders already shown, remembered across restarts of the app (so reopening it does not repeat
 * them). Each id is kept with its day; today and yesterday are enough (bedtime can be after midnight).
 */
export function loadSent(today: string, storage: Pick<Storage, 'getItem'> = localStorage) {
  const sent = new Map<string, string>()
  try {
    const raw = JSON.parse(storage.getItem(SENT_KEY) ?? '{}') as Record<string, unknown>
    const oldest = addDaysStr(today, -1)
    for (const [id, day] of Object.entries(raw))
      if (typeof day === 'string' && day >= oldest) sent.set(id, day)
  } catch {
    /* damaged or unavailable: start empty */
  }
  return sent
}

export function saveSent(
  sent: Map<string, string>,
  storage: Pick<Storage, 'setItem'> = localStorage,
) {
  try {
    storage.setItem(SENT_KEY, JSON.stringify(Object.fromEntries(sent)))
  } catch {
    /* private mode: reminders still work, they are just not remembered */
  }
}

/** Checks once a minute while the app is open. Honest limit: no server -> no push when the app is closed. */
export function useReminders() {
  const enabled = useStore((s) => s.settings.reminders)
  useEffect(() => {
    if (!enabled || !notificationsSupported() || Notification.permission !== 'granted') return
    const tick = () => {
      const now = new Date()
      const today = todayStr(now)
      const sent = loadSent(today)
      const data = selectData(useStore.getState())
      const due = dueReminders(data, now, new Set(sent.keys()))
      if (!due.length) return
      for (const r of due) {
        sent.set(r.id, today)
        void showNotification(r.title, r.body, { tag: r.id })
      }
      saveSent(sent)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [enabled])
}
