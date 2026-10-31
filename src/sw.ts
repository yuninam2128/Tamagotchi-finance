/// <reference lib="webworker" />
// 서비스 워커: 앱 셸 프리캐시 + 폰트·3D 모델 캐시 + 웹 푸시
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

registerRoute(
  ({ request, url }) => request.destination === 'font' || url.pathname.endsWith('.glb'),
  new CacheFirst({ cacheName: 'static-heavy', plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })] }),
)

// 업데이트 안내에서 '업데이트'를 누르면 바로 교체
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
clientsClaim()

self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data?.json() as { title?: string; body?: string; url?: string }
    } catch {
      return { body: event.data?.text() }
    }
  })()
  event.waitUntil(
    self.registration.showNotification(data?.title ?? '지갑몬', {
      body: data?.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: data?.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string })?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => 'focus' in w)
      if (win) {
        void (win as WindowClient).navigate(url)
        return (win as WindowClient).focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
