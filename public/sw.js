import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Workbox precaching (VitePWA injectManifest will fill this in)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

// ==========================================
// PUSH NOTIFICATION HANDLER
// ==========================================
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'แจ้งเตือนใหม่', body: event.data.text() };
    }
  } else {
    data = { title: 'SON CONTRACTOR', body: 'มีการแจ้งเตือนใหม่ในระบบ' };
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: {
      url: data.url || '/apps/store-dragdrop/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/apps/store-dragdrop/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/apps/store-dragdrop') && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
