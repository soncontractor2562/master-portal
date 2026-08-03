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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'store-noti-' + Date.now(),
    renotify: true,
    data: {
      url: data.url || '/apps/store-dragdrop/'
    },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window client is already open, focus it and optionally navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/apps/store-dragdrop') && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
