// The Android side of notifications: the system shows them at the planned time, even when the app is
// closed. Everything goes through try/catch: a plugin failure never crashes the app.
import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './platform'
import { numericId, planNotifications, type Channel } from './nativePlan'
import type { AppData } from '../types'
import { t } from '../i18n'

const ROUTINE_ACTIONS = 'ROUTINE'

export async function ensureChannels(): Promise<void> {
  if (!isNative()) return
  try {
    const defs: { id: Channel; importance: 1 | 2 | 3 | 4 | 5 }[] = [
      { id: 'reminders', importance: 4 },
      { id: 'routine', importance: 4 },
      { id: 'alarm', importance: 5 },
    ]
    for (const c of defs)
      await LocalNotifications.createChannel({
        id: c.id,
        name: t(`notif.channel.${c.id}`),
        importance: c.importance,
        visibility: 1,
        vibration: true,
      })
    await LocalNotifications.registerActionTypes({
      types: [{ id: ROUTINE_ACTIONS, actions: [{ id: 'done', title: t('rem.routine.done') }] }],
    })
  } catch {
    /* channels are a nicety: notifications still work on the default one */
  }
}

export async function notificationsGranted(): Promise<boolean> {
  try {
    return (await LocalNotifications.checkPermissions()).display === 'granted'
  } catch {
    return false
  }
}

/** Shows the system question (Android 13+). Call it after the friendly explanation. */
export async function requestNativePermission(): Promise<boolean> {
  try {
    return (await LocalNotifications.requestPermissions()).display === 'granted'
  } catch {
    return false
  }
}

/** Exact alarms are a separate switch the user grants in the system settings (SCHEDULE_EXACT_ALARM). */
export async function exactAlarmsAllowed(): Promise<boolean> {
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted'
  } catch {
    return false
  }
}

export async function openExactAlarmSettings(): Promise<void> {
  try {
    await LocalNotifications.changeExactNotificationSetting()
  } catch {
    /* the system screen could not be opened */
  }
}

/** Cancels everything pending and schedules the plan for the next two days again. */
export async function rescheduleAll(data: AppData, now = new Date()): Promise<number> {
  if (!isNative()) return 0
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length)
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      })
    if (!data.settings.reminders) return 0
    if (!(await notificationsGranted())) return 0
    const plan = planNotifications(data, now)
    if (!plan.length) return 0
    await LocalNotifications.schedule({
      notifications: plan.map((n) => ({
        id: numericId(n.key),
        title: n.title,
        body: n.body,
        channelId: n.channel,
        schedule: { at: n.at, allowWhileIdle: true },
        actionTypeId: n.actions?.length ? ROUTINE_ACTIONS : undefined,
        // the alarm stays until it is stopped on purpose (hold the button in the app)
        ongoing: n.channel === 'alarm',
        autoCancel: n.channel !== 'alarm',
        extra: { key: n.key, route: n.route },
      })),
    })
    return plan.length
  } catch {
    return 0
  }
}

/** One notification right now (the test button, "next step" of the routine). */
export async function showNow(
  title: string,
  body: string,
  opts: { tag?: string; actions?: { action: string; title: string }[] } = {},
): Promise<boolean> {
  try {
    if (!(await notificationsGranted())) return false
    await LocalNotifications.schedule({
      notifications: [
        {
          id: numericId(opts.tag ?? `now-${Date.now()}`),
          title,
          body,
          channelId: opts.actions?.length ? 'routine' : 'reminders',
          actionTypeId: opts.actions?.length ? ROUTINE_ACTIONS : undefined,
          extra: { key: opts.tag ?? '', route: '/' },
        },
      ],
    })
    return true
  } catch {
    return false
  }
}

export async function cancelByKey(key: string): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: numericId(key) }] })
  } catch {
    /* already gone */
  }
}
