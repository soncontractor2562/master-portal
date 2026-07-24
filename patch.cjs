const fs = require('fs');
let appJs = fs.readFileSync('C:/Users/HP/Desktop/Antigravity/Master Portal/public/apps/store-dragdrop/app.js', 'utf8');

// 1. Add apiPost handlers
const renameItemApi = `
    if (pathStr === '/api/inventory/rename-item') {
      const { oldName, newName } = body;
      const { data: exist, error: e1 } = await supabaseClient.from('store_items').select('*').eq('name', newName);
      if (e1) throw e1;
      if (exist && exist.length > 0) throw new Error('มีชื่อนี้แล้ว');
      const { error: e2 } = await supabaseClient.from('store_items').update({ name: newName }).eq('name', oldName);
      if (e2) throw e2;
      return { success: true, message: 'เปลี่ยนชื่อเป็น ' + newName + ' สำเร็จ' };
    }
    if (pathStr === '/api/locations/rename') {
      const { oldName, newName } = body;
      const { data: exist, error: e1 } = await supabaseClient.from('store_locations').select('*').eq('name', newName);
      if (e1) throw e1;
      if (exist && exist.length > 0) throw new Error('มีชื่อสถานที่นี้แล้ว');
      const { error: e2 } = await supabaseClient.from('store_locations').update({ name: newName }).eq('name', oldName);
      if (e2) throw e2;
      const { data: items, error: e3 } = await supabaseClient.from('store_items').select('*');
      if (e3) throw e3;
      if (items) {
        for (const item of items) {
          if (item.quantities && item.quantities[oldName] !== undefined) {
            const val = item.quantities[oldName];
            delete item.quantities[oldName];
            item.quantities[newName] = val;
            await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
          }
        }
      }
      return { success: true, message: 'เปลี่ยนชื่อสถานที่เป็น ' + newName + ' สำเร็จ' };
    }
`;
appJs = appJs.replace(`if (pathStr === '/api/inventory/add-item') {`, renameItemApi + `\n    if (pathStr === '/api/inventory/add-item') {`);

// 2. Add startRenameItem function
const renameItemFn = `
function startRenameItem() {
  if (!state.currentItem) return;
  var oldName = state.currentItem.name;
  var newName = prompt('เปลี่ยนชื่อวัสดุ "' + oldName + '" เป็น:', oldName);
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
  apiPost('/api/inventory/rename-item', { oldName: oldName, newName: newName.trim() })
    .then(function(res) {
      showToast(res.message, 'success');
      document.getElementById('itemDetailModal').style.display = 'none';
      return loadInventory();
    })
    .catch(function(err) {
      alert('Error: ' + err.message);
    });
}
`;
appJs += '\n' + renameItemFn;

// 3. Add startRenameLocation function
const renameLocFn = `
function startRenameLocation(oldName) {
  var newName = prompt('เปลี่ยนชื่อสถานที่ "' + oldName + '" เป็น:', oldName);
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
  apiPost('/api/locations/rename', { oldName: oldName, newName: newName.trim() })
    .then(function(res) {
      showToast(res.message, 'success');
      return apiGet('/api/locations');
    })
    .then(function(data) {
      state.allLocations = data.locations || [];
      renderLocationManageList();
      return loadInventory();
    })
    .catch(function(err) {
      alert('Error: ' + err.message);
    });
}
`;
appJs += '\n' + renameLocFn;

// 4. Add rename button to renderLocationManageList
const locRowReplace = `'<span style="font-size:20px;">' + getLocIcon(loc) + '</span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:13px;font-weight:600;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;">' + loc.name + '</div>' +
      '<div style="font-size:11px;color:#64748b;">' + getLocTypeLabel(loc.type) + '</div>' +
      '</div>' +
      '<button onclick="startRenameLocation(\\'' + esc(loc.name) + '\\')" style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#60a5fa;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-family:\\'Sarabun\\',sans-serif;margin-right:8px;">✏️</button>' +`;
appJs = appJs.replace(`'<span style="font-size:20px;">' + getLocIcon(loc) + '</span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:13px;font-weight:600;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;">' + loc.name + '</div>' +
      '<div style="font-size:11px;color:#64748b;">' + getLocTypeLabel(loc.type) + '</div>' +
      '</div>' +`, locRowReplace);

fs.writeFileSync('C:/Users/HP/Desktop/Antigravity/Master Portal/public/apps/store-dragdrop/app.js', appJs);
console.log('app.js patched');
