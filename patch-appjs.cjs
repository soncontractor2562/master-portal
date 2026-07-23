// patch-appjs.cjs - Safely applies all Store Manager improvements to app.js
// Using precise string matching with CRLF line endings
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public/apps/store-dragdrop/app.js');
let src = fs.readFileSync(appJsPath, 'utf8');
const origLen = src.length;
console.log('Original file size:', origLen, 'bytes');

let changes = 0;

function replace(oldStr, newStr, desc) {
  const count = src.split(oldStr).length - 1;
  if (count === 0) {
    console.error('NOT FOUND: ' + desc);
    return false;
  }
  if (count > 1) {
    console.error('MULTIPLE MATCHES (' + count + '): ' + desc + ' - skipping');
    return false;
  }
  src = src.replace(oldStr, newStr);
  changes++;
  console.log('OK: ' + desc);
  return true;
}

// ============================================================
// 1. Add rename-item + initial stock to /api/inventory/add-item
// ============================================================
replace(
  "  if (pathStr === '/api/inventory/add-item') {\r\n    if (local.items.some(function(i) { return i.name === body.name; })) throw new Error('\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27');\r\n    const ni = { row: local.items.length + 3, category: body.category||'\u0e17\u0e31\u0e48\u0e27\u0e44\u0e1b', name: body.name, unit: body.unit||'\u0e0a\u0e34\u0e49\u0e19', quantities: {}, note: body.note||'' };\r\n    local.locations.forEach(function(l) { ni.quantities[l.name] = 0; });\r\n    local.items.push(ni);\r\n    saveLocalData(local);\r\n    return { success: true, message: '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 ' + body.name + ' \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22' };\r\n  }",
  "  if (pathStr === '/api/inventory/add-item') {\r\n    if (local.items.some(function(i) { return i.name === body.name; })) throw new Error('\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27');\r\n    var ni = { row: local.items.length + 3, category: body.category||'\u0e17\u0e31\u0e48\u0e27\u0e44\u0e1b', name: body.name, unit: body.unit||'\u0e0a\u0e34\u0e49\u0e19', quantities: {}, note: body.note||'' };\r\n    local.locations.forEach(function(l) { ni.quantities[l.name] = 0; });\r\n    if (body.initLocation && Number(body.initQty) > 0) {\r\n      ni.quantities[body.initLocation] = Number(body.initQty);\r\n      local.history = local.history || [];\r\n      local.history.unshift({ date: new Date().toISOString(), type: '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23', itemName: body.name, quantity: Number(body.initQty), fromLocation: body.initLocation, toLocation: body.initLocation, reporter: '\u0e23\u0e30\u0e1a\u0e1a', remark: '\u0e22\u0e2d\u0e14\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19', balanceFrom: 0, balanceTo: Number(body.initQty) });\r\n    }\r\n    local.items.push(ni);\r\n    saveLocalData(local);\r\n    return { success: true, message: '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 ' + body.name + ' \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22' };\r\n  }\r\n\r\n  if (pathStr === '/api/inventory/rename-item') {\r\n    var itm = local.items.find(function(i) { return i.name === body.oldName; });\r\n    if (!itm) throw new Error('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 ' + body.oldName);\r\n    if (local.items.some(function(i) { return i.name === body.newName; })) throw new Error('\u0e21\u0e35\u0e0a\u0e37\u0e48\u0e2d \"' + body.newName + '\" \u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27');\r\n    itm.name = body.newName;\r\n    (local.history || []).forEach(function(h) { if (h.itemName === body.oldName) h.itemName = body.newName; });\r\n    saveLocalData(local);\r\n    return { success: true, message: '\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d \"' + body.oldName + '\" \u21d2 \"' + body.newName + '\" \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22' };\r\n  }",
  'add-item: initial stock + rename-item endpoint'
);

// ============================================================
// 2. Add rename-location endpoint after /api/locations/add
// ============================================================
replace(
  "  if (pathStr === '/api/locations/add') {\r\n    if (local.locations.some(function(l) { return l.name === body.name; })) throw new Error('\u0e21\u0e35\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48\u0e19\u0e35\u0e49\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27');\r\n    local.locations.push({ name: body.name, type: body.type||'\u0e44\u0e0b\u0e15\u0e4c\u0e07\u0e32\u0e19', col: local.locations.length + 4, archived: false, hideCount: false });\r\n    saveLocalData(local);\r\n    return { success: true, message: '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48 ' + body.name + ' \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22' };\r\n  }",
  "  if (pathStr === '/api/locations/add') {\r\n    if (local.locations.some(function(l) { return l.name === body.name; })) throw new Error('\u0e21\u0e35\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48\u0e19\u0e35\u0e49\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27');\r\n    local.locations.push({ name: body.name, type: body.type||'\u0e44\u0e0b\u0e15\u0e4c\u0e07\u0e32\u0e19', col: local.locations.length + 4, archived: false, hideCount: false });\r\n    saveLocalData(local);\r\n    return { success: true, message: '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48 ' + body.name + ' \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22' };\r\n  }\r\n\r\n  if (pathStr === '/api/locations/rename') {\r\n    var loc = local.locations.find(function(l) { return l.name === body.oldName; });\r\n    if (!loc) throw new Error('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48 ' + body.oldName);\r\n    if (local.locations.some(function(l) { return l.name === body.newName; })) throw new Error('\u0e21\u0e35\u0e0a\u0e37\u0e48\u0e2d \"' + body.newName + '\" \u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27');\r\n    local.items.forEach(function(it) {\r\n      if (it.quantities.hasOwnProperty(body.oldName)) {\r\n        it.quantities[body.newName] = it.quantities[body.oldName];\r\n        delete it.quantities[body.oldName];\r\n      }\r\n    });\r\n    (local.history || []).forEach(function(h) {\r\n      if (h.fromLocation === body.oldName) h.fromLocation = body.newName;\r\n      if (h.toLocation === body.oldName) h.toLocation = body.newName;\r\n    });\r\n    loc.name = body.newName;\r\n    saveLocalData(local);\r\n    return { success: true, message: '\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48 \"' + body.oldName + '\" \u21d2 \"' + body.newName + '\" \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22' };\r\n  }",
  'locations/rename endpoint'
);

// ============================================================
// 3. updateCategoryDatalist: populate init-stock location dropdown
// ============================================================
replace(
  "  dl.innerHTML = state.allCategories.map(function(c) {\r\n    return '<option value=\"' + esc(c) + '\">' + c + '</option>';\r\n  }).join('');",
  "  dl.innerHTML = state.allCategories.map(function(c) {\r\n    return '<option value=\"' + esc(c) + '\">' + c + '</option>';\r\n  }).join('');\r\n  var initLocSel = document.getElementById('newItemInitLoc');\r\n  if (initLocSel) {\r\n    initLocSel.innerHTML = '<option value=\"\">\u2014 \u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38 \u2014</option>' +\r\n      state.locations.map(function(l) { return '<option value=\"' + esc(l.name) + '\">' + getLocIcon(l) + ' ' + l.name + '</option>'; }).join('');\r\n  }",
  'updateCategoryDatalist: add init-stock dropdown'
);

// ============================================================
// 4. confirmAddItem: send initLocation + initQty
// ============================================================
replace(
  "  if (!name) { showToast('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e48\u0e07\u0e02\u0e2d\u0e07', 'error'); return; }\r\n  try {\r\n    var res = await apiPost('/api/inventory/add-item', { name: name, category: category, unit: unit, note: note });",
  "  var initLoc = (document.getElementById('newItemInitLoc')||{value:''}).value;\r\n  var initQty = Number((document.getElementById('newItemInitQty')||{value:0}).value);\r\n  if (!name) { showToast('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e48\u0e07\u0e02\u0e2d\u0e07', 'error'); return; }\r\n  try {\r\n    var res = await apiPost('/api/inventory/add-item', { name: name, category: category, unit: unit, note: note, initLocation: initLoc, initQty: initQty });",
  'confirmAddItem: pass initLocation + initQty'
);

// ============================================================
// 5. showItemDetail: store current item name + add rename button support
// ============================================================
replace(
  "// ====== ITEM DETAIL MODAL ======\r\nfunction showItemDetail(itemName) {\r\n  var item = state.items.find(function(it) { return it.name === itemName; });\r\n  if (!item) return;",
  "// ====== ITEM DETAIL MODAL ======\r\nvar _detailCurrentItem = null;\r\nfunction showItemDetail(itemName) {\r\n  var item = state.items.find(function(it) { return it.name === itemName; });\r\n  if (!item) return;\r\n  _detailCurrentItem = itemName;",
  'showItemDetail: track current item'
);

replace(
  "function closeItemDetailModal(e) {\r\n  if (e && e.target !== document.getElementById('itemDetailModal')) return;\r\n  document.getElementById('itemDetailModal').style.display = 'none';\r\n}",
  "function closeItemDetailModal(e) {\r\n  if (e && e.target !== document.getElementById('itemDetailModal')) return;\r\n  document.getElementById('itemDetailModal').style.display = 'none';\r\n  _detailCurrentItem = null;\r\n}\r\n\r\n// ====== RENAME ITEM ======\r\nfunction startRenameItem() {\r\n  if (!_detailCurrentItem) return;\r\n  var oldName = _detailCurrentItem;\r\n  var newName = prompt('\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d\u0e27\u0e31\u0e2a\u0e14\u0e38 \"' + oldName + '\" \u0e40\u0e1b\u0e47\u0e19:', oldName);\r\n  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;\r\n  newName = newName.trim();\r\n  apiPost('/api/inventory/rename-item', { oldName: oldName, newName: newName })\r\n    .then(function(res) {\r\n      showToast(res.message, 'success');\r\n      _detailCurrentItem = newName;\r\n      document.getElementById('itemDetailModal').style.display = 'none';\r\n      return loadInventory();\r\n    })\r\n    .catch(function(err) { showToast(err.message, 'error'); });\r\n}",
  'closeItemDetailModal + startRenameItem'
);

// ============================================================
// 6. renderLocationManageList: add rename button
// ============================================================
replace(
  "      '<label class=\"toggle-switch\">' +\r\n      '<input type=\"checkbox\" ' + (isActive ? 'checked' : '') + ' onchange=\"toggleArchiveLocation(\\'' + esc(loc.name) + '\\', this.checked)\" />' +\r\n      '<span class=\"toggle-slider\"></span>' +\r\n      '</label></div>';",
  "      '<button onclick=\"startRenameLoc(\\'' + esc(loc.name) + '\\')\" style=\"background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);color:#60a5fa;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:13px;flex-shrink:0;margin-right:6px;\" title=\"\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d\">\u270f\ufe0f</button>' +\r\n      '<label class=\"toggle-switch\">' +\r\n      '<input type=\"checkbox\" ' + (isActive ? 'checked' : '') + ' onchange=\"toggleArchiveLocation(\\'' + esc(loc.name) + '\\', this.checked)\" />' +\r\n      '<span class=\"toggle-slider\"></span>' +\r\n      '</label></div>';",
  'renderLocationManageList: add rename button'
);

// Add startRenameLoc function after renderLocationManageList closing brace
replace(
  "async function toggleArchiveLocation(name, active) {",
  "function startRenameLoc(oldName) {\r\n  var newName = prompt('\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48 \"' + oldName + '\" \u0e40\u0e1b\u0e47\u0e19:', oldName);\r\n  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;\r\n  newName = newName.trim();\r\n  apiPost('/api/locations/rename', { oldName: oldName, newName: newName })\r\n    .then(function(res) {\r\n      showToast(res.message, 'success');\r\n      return Promise.all([apiGet('/api/locations'), loadInventory()]);\r\n    })\r\n    .then(function(results) {\r\n      state.allLocations = (results[0] && results[0].locations) ? results[0].locations : state.locations.slice();\r\n      renderLocationManageList();\r\n    })\r\n    .catch(function(err) { showToast(err.message, 'error'); });\r\n}\r\n\r\nasync function toggleArchiveLocation(name, active) {",
  'startRenameLoc function'
);

// ============================================================
// Final check
// ============================================================
const newLen = src.length;
console.log('\nTotal changes applied:', changes);
console.log('New file size:', newLen, 'bytes (delta:', newLen - origLen, ')');

if (changes < 7) {
  console.error('WARNING: Expected 7 changes but only got ' + changes);
}

fs.writeFileSync(appJsPath, src, 'utf8');
console.log('File written successfully.');
