import { expect, test, vi } from 'vitest'
import { onNotificationClick } from './swNotifications'

const scope = 'https://example.test/my-day-ai/'
const note = () => ({ tag: 'ev-1', close: vi.fn() })

test('A-10: a touch on a notification brings the open app to the front', async () => {
  const focus = vi.fn().mockResolvedValue(undefined)
  const postMessage = vi.fn()
  const open = vi.fn()
  const n = note()
  await onNotificationClick(n, '', {
    scope,
    clients: async () => [
      { url: 'https://other.test/', postMessage: vi.fn() },
      { url: `${scope}#/study`, focus, postMessage },
    ],
    open,
  })
  expect(n.close).toHaveBeenCalled()
  expect(focus).toHaveBeenCalled()
  expect(postMessage).toHaveBeenCalledWith({ type: 'notification-click', tag: 'ev-1', action: '' })
  expect(open).not.toHaveBeenCalled()
})

test('A-10: with the app closed, the touch opens it', async () => {
  const open = vi.fn().mockResolvedValue(undefined)
  await onNotificationClick(note(), '', { scope, clients: async () => [], open })
  expect(open).toHaveBeenCalledWith(scope)
})

test('a button of the notification reaches the app; "done" does not pull the app to the front', async () => {
  const focus = vi.fn()
  const postMessage = vi.fn()
  await onNotificationClick(note(), 'done', {
    scope,
    clients: async () => [{ url: scope, focus, postMessage }],
    open: vi.fn(),
  })
  expect(postMessage).toHaveBeenCalledWith({
    type: 'notification-click',
    tag: 'ev-1',
    action: 'done',
  })
  expect(focus).not.toHaveBeenCalled()

  const open = vi.fn().mockResolvedValue(undefined)
  await onNotificationClick(note(), 'done', { scope, clients: async () => [], open })
  expect(open).toHaveBeenCalledWith(`${scope}?n-action=done&n-tag=ev-1`)
})
