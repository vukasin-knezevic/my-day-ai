// What happens when a notification is touched. Runs inside the service worker (src/sw.ts); kept here,
// without service-worker types, so it can be tested.

/** A message the service worker sends to the open app after a touch on a notification. */
export interface NotificationMessage {
  type: 'notification-click'
  /** The reminder id (the notification `tag`). */
  tag: string
  /** The button that was pressed ('' = the notification itself). */
  action: string
}

interface ClientLike {
  url: string
  focus?: () => Promise<unknown>
  postMessage: (msg: NotificationMessage) => void
}

export interface ClickContext {
  /** Address of the app (the service worker scope). */
  scope: string
  /** Open windows of the app. */
  clients: () => Promise<readonly ClientLike[]>
  open: (url: string) => Promise<unknown>
}

/** Buttons that do their work without bringing the app to the front. */
export const QUIET_ACTIONS: readonly string[] = ['done']

/**
 * A touch on a notification brings the app to the front (or opens it). A button of the notification
 * is passed on to the app; if the app is closed, it opens with the action in the address.
 */
export async function onNotificationClick(
  n: { tag: string; close: () => void },
  action: string,
  ctx: ClickContext,
): Promise<void> {
  n.close()
  const msg: NotificationMessage = { type: 'notification-click', tag: n.tag, action }
  const windows = (await ctx.clients()).filter((c) => c.url.startsWith(ctx.scope))
  const target = windows[0]
  if (target) {
    target.postMessage(msg)
    if (!QUIET_ACTIONS.includes(action)) await target.focus?.()
    return
  }
  const query = action
    ? `?n-action=${encodeURIComponent(action)}&n-tag=${encodeURIComponent(n.tag)}`
    : ''
  await ctx.open(`${ctx.scope}${query}`)
}
