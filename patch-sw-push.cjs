const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, 'dist', 'sw.js');
const pushHandler = `

// ====== PUSH NOTIFICATION HANDLER ======
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
    data: { url: data.url || '/apps/store-dragdrop/' },
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
`;

let content = fs.readFileSync(swPath, 'utf8');
if (content.includes('PUSH NOTIFICATION HANDLER')) {
  console.log('Push handler already present, skipping.');
} else {
  fs.writeFileSync(swPath, content + pushHandler, 'utf8');
  console.log('✅ Push handler appended to dist/sw.js successfully!');
}
