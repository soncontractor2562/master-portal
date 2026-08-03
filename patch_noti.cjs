const fs = require('fs');

let appJs = fs.readFileSync('public/apps/store-dragdrop/app.js', 'utf8');

// 1. Inject initPushNotifications into doLogin
if (!appJs.includes('initPushNotifications();')) {
  appJs = appJs.replace(
    /showToast\('เข้าสู่ระบบสำเร็จ', 'success'\);\s*applyUserRole\(\);\s*refreshAll\(\);/g,
    "showToast('เข้าสู่ระบบสำเร็จ', 'success');\n        applyUserRole();\n        refreshAll();\n        initPushNotifications();\n        fetchNotifications();"
  );
}

// 2. Append the notification logic at the end
const notiLogic = `
// ==========================================
// NOTIFICATION SYSTEM (In-App + PWA Push)
// ==========================================

async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('ServiceWorker registered:', registration);
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return;
    }
    
    const publicVapidKey = 'BGdBfRODtTZuN6JKMW0aE_MIORsiEl5LTBwkB-Mnagn5Qlzp6X0b-c6_KOuNkvkTNec6YyAy-7o08G52S7bdNho';
    
    const urlBase64ToUint8Array = (base64String) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\\-/g, '+')
        .replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };
    
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
    }
    
    if (state.currentUser) {
      const subObj = JSON.parse(JSON.stringify(subscription));
      const { error } = await supabaseClient.from('store_push_subscriptions').upsert({
        username: state.currentUser.username,
        endpoint: subObj.endpoint,
        keys_p256dh: subObj.keys.p256dh,
        keys_auth: subObj.keys.auth
      }, { onConflict: 'endpoint' });
      if (error) console.error('Error saving subscription:', error);
    }
    
  } catch (err) {
    console.error('Error initializing push notifications:', err);
  }
}

async function fetchNotifications() {
  if (!state.currentUser || !supabaseClient) return;
  try {
    const { data: notis, error: err1 } = await supabaseClient
      .from('store_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (err1) throw err1;
    
    const { data: reads, error: err2 } = await supabaseClient
      .from('store_notification_reads')
      .select('notification_id')
      .eq('username', state.currentUser.username);
    if (err2) throw err2;
    
    const readIds = new Set(reads.map(r => r.notification_id));
    let unreadCount = 0;
    
    const notiListHtml = notis.map(n => {
      const isRead = readIds.has(n.id);
      if (!isRead) unreadCount++;
      
      const d = new Date(n.created_at);
      const dateStr = d.getDate().toString().padStart(2,'0') + '/' + (d.getMonth()+1).toString().padStart(2,'0') + ' ' + d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
      
      return \`
        <div onclick="clickNotification('\${n.id}', '\${n.link_url || ''}', \${isRead})" style="padding:14px 20px; border-bottom:1px solid var(--border); cursor:pointer; background:\${isRead ? 'transparent' : 'rgba(59,130,246,0.1)'}; display:flex; gap:12px; align-items:flex-start; transition:background .2s;">
          <div style="font-size:24px; line-height:1; flex-shrink:0;">\${getNotiEmoji(n.type)}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:14px; font-weight:700; color:\${isRead ? 'var(--text)' : '#60a5fa'}; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${n.title}</div>
            <div style="font-size:13px; color:var(--muted); line-height:1.4;">\${n.message}</div>
            <div style="font-size:11px; color:#475569; margin-top:6px;">\${dateStr}</div>
          </div>
          \${!isRead ? '<div style="width:8px; height:8px; background:#3b82f6; border-radius:50%; flex-shrink:0; margin-top:8px;"></div>' : ''}
        </div>
      \`;
    }).join('');
    
    const container = document.getElementById('notiList');
    if (container) {
      if (notis.length === 0) {
        container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:var(--muted);">ไม่มีการแจ้งเตือน</div>';
      } else {
        container.innerHTML = notiListHtml;
      }
    }
    
    document.querySelectorAll('.noti-badge').forEach(b => {
      if (unreadCount > 0) {
        b.style.display = 'block';
        b.textContent = unreadCount > 99 ? '99+' : unreadCount;
      } else {
        b.style.display = 'none';
      }
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}

function getNotiEmoji(type) {
  if (type === 'move') return '🚛';
  if (type === 'receive') return '📥';
  if (type === 'mismatch') return '⚠️';
  if (type === 'lost') return '❌';
  if (type === 'adjust') return '⚖️';
  return '🔔';
}

async function markNotiAsRead(id) {
  if (!state.currentUser) return;
  try {
    await supabaseClient.from('store_notification_reads').insert({
      notification_id: id,
      username: state.currentUser.username
    });
    fetchNotifications();
  } catch (err) { }
}

async function markAllNotiAsRead() {
  if (!state.currentUser) return;
  try {
    const { data: notis } = await supabaseClient.from('store_notifications').select('id');
    if (!notis) return;
    
    const reads = notis.map(n => ({
      notification_id: n.id,
      username: state.currentUser.username
    }));
    
    await supabaseClient.from('store_notification_reads').upsert(reads, { onConflict: 'notification_id,username' });
    fetchNotifications();
  } catch (err) {
    console.error(err);
  }
}

function clickNotification(id, linkUrl, isRead) {
  if (!isRead) {
    markNotiAsRead(id);
  }
  closeNotiModal();
  if (linkUrl) {
    switchPage(linkUrl);
  }
}

function openNotiModal() {
  document.getElementById('notiModal').style.display = 'flex';
  fetchNotifications();
}

function closeNotiModal() {
  document.getElementById('notiModal').style.display = 'none';
}

setInterval(() => {
  if (state.currentUser) fetchNotifications();
}, 60000);

async function broadcastNotification(type, title, message, linkUrl) {
  try {
    const { data, error } = await supabaseClient.from('store_notifications').insert({
      type: type,
      title: title,
      message: message,
      link_url: linkUrl
    }).select();
    
    if (error) throw error;
    
    fetch('/api/push-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        message: message,
        url: window.location.origin + '/apps/store-dragdrop/'
      })
    }).catch(e => console.error('Push API err:', e));
    
  } catch (err) {
    console.error('Broadcast error:', err);
  }
}
`;

if (!appJs.includes('function fetchNotifications()')) {
  appJs += '\n' + notiLogic;
}

// 3. Inject broadcastNotification calls into various action handlers.

// A. Move Bulk (in confirmMoveBulk)
if (!appJs.includes("broadcastNotification('move', '🚚 ขนย้ายสินค้า',")) {
  appJs = appJs.replace(
    /showToast\('บันทึกขนย้ายเรียบร้อย', 'success'\);\s*closeMoveModal\(\);\s*refreshAll\(\);/g,
    "showToast('บันทึกขนย้ายเรียบร้อย', 'success');\n    closeMoveModal();\n    refreshAll();\n    broadcastNotification('move', '🚚 ขนย้ายสินค้า', `\${state.sourceLocation} ➔ \${state.destLocation} (\${moves.length} รายการ)`, 'pending');"
  );
}

// B. Receive (in confirmReceive)
if (!appJs.includes("broadcastNotification('mismatch', '⚠️ แจ้งเตือนด่วน'")) {
  appJs = appJs.replace(
    /showToast\('รับของสำเร็จ', 'success'\);\s*closeReceiveModal\(\);\s*refreshAll\(\);/g,
    `showToast('รับของสำเร็จ', 'success');
    closeReceiveModal();
    refreshAll();
    
    let hasMismatch = currentReceiveMove.items.some(i => Number(i.quantitySent) !== Number(i.quantityReceived));
    if (hasMismatch) {
      broadcastNotification('mismatch', '⚠️ แจ้งเตือนด่วน', \`\${currentReceiveMove.to_location} รับของจาก \${currentReceiveMove.from_location} ไม่ครบ รอการตรวจสอบ\`, 'pending');
    } else {
      broadcastNotification('receive', '📥 รับของเรียบร้อย', \`\${currentReceiveMove.to_location} รับของจาก \${currentReceiveMove.from_location} ครบถ้วน\`, 'history');
    }`
  );
}

// C. Force Complete / Mark Lost (confirmAdjustReceive)
if (!appJs.includes("broadcastNotification('lost', '❌ บันทึกของสูญหาย'")) {
  appJs = appJs.replace(
    /showToast\('จบงานเรียบร้อย', 'success'\);\s*closeAdjustReceiveModal\(\);\s*closeReceiveModal\(\);\s*refreshAll\(\);/g,
    `showToast('จบงานเรียบร้อย', 'success');
    closeAdjustReceiveModal();
    closeReceiveModal();
    refreshAll();
    broadcastNotification('lost', '❌ บันทึกของสูญหาย', \`เคลียร์รายการขนย้าย \${currentReceiveMove.from_location} ➔ \${currentReceiveMove.to_location} เรียบร้อยแล้ว\`, 'history');`
  );
}

// D. Adjust Stock (confirmAdjust)
if (!appJs.includes("broadcastNotification('adjust', '⚖️ ปรับยอดสต็อก'")) {
  appJs = appJs.replace(
    /showToast\('ปรับยอดสำเร็จ', 'success'\);\s*closeAdjustModal\(\);\s*refreshAll\(\);/g,
    `showToast('ปรับยอดสำเร็จ', 'success');
    closeAdjustModal();
    refreshAll();
    let adjLoc = state.currentUser.role === 'ผู้ใช้งาน' ? 'หน้างาน' : 'สโตร์';
    let linkTarget = state.currentUser.role === 'ผู้ใช้งาน' ? 'pending' : 'history';
    broadcastNotification('adjust', '⚖️ ปรับยอดสต็อก', \`\${adjLoc} ขอปรับยอด \${document.getElementById('adjItemName').textContent}\`, linkTarget);`
  );
}

fs.writeFileSync('public/apps/store-dragdrop/app.js', appJs);
console.log('App.js patched successfully!');
