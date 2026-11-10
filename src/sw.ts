/// <reference lib="webworker" />
// The service worker. Keeps the app available offline (the same cache the generated worker had) and
// handles touches on notifications, which a generated worker cannot do.
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { onNotificationClick } from './lib/swNotifications'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// every address of the app is the same page (the app is a single page)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// "New update" -> the user agreed to restart: the waiting worker takes over
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting()
})

self.addEventListener('notificationclick', (event) => {
  event.waitUntil(
    onNotificationClick(event.notification, event.action, {
      scope: self.registration.scope,
      clients: () => self.clients.matchAll({ type: 'window', includeUncontrolled: true }),
      open: (url) => self.clients.openWindow(url),
    }),
  )
})
