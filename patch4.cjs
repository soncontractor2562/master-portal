const fs = require('fs');

const sortModeJs = `// ====== INVENTORY SORT MODE ======
// Sort mode module using SortableJS

var _sortState = {
  active: false,
  sortableInstances: []
};

function toggleSortMode() {
  _sortState.active = !_sortState.active;
  var btn = document.getElementById('sortToggleBtn');
  var banner = document.getElementById('sortModeBanner');

  if (_sortState.active) {
    document.body.classList.add('sort-mode');
    if (btn) btn.classList.add('btn-sort-active');
    if (banner) banner.style.display = 'block';
    
    // Re-render to ensure drag handles are visible
    renderInventoryList();
    
    if (typeof Sortable !== 'undefined') {
      var groupContainers = document.querySelectorAll('#inventoryList .glass-card');
      groupContainers.forEach(function(container) {
        if (!container.id || !container.id.startsWith('group-')) return;
        var sortable = new Sortable(container, {
          group: 'inventory', // allow dragging between groups!
          handle: '.drag-handle',
          animation: 150,
          ghostClass: 'dragging-row',
          onEnd: function (evt) {
            setTimeout(function() {
               var allRows = document.querySelectorAll('#inventoryList [data-item-name]');
               var newOrder = Array.from(allRows).map(function(el) { return el.dataset.itemName; });
               
               var newItems = [];
               newOrder.forEach(function(n) {
                 var it = state.items.find(function(x) { return x.name === n; });
                 if (it) newItems.push(it);
               });
               state.items.forEach(function(it) {
                 if (!newItems.find(function(x) { return x.name === it.name; })) newItems.push(it);
               });
               state.items = newItems;
            }, 10);
          }
        });
        _sortState.sortableInstances.push(sortable);
      });
    }
    showToast('โหมดจัดเรียง: ลาก ≡ เพื่อเรียงลำดับ', 'info');
  } else {
    document.body.classList.remove('sort-mode');
    if (btn) btn.classList.remove('btn-sort-active');
    if (banner) banner.style.display = 'none';
    
    _sortState.sortableInstances.forEach(function(s) { s.destroy(); });
    _sortState.sortableInstances = [];
    
    saveInvSortOrder();
    renderInventoryList();
    showToast('บันทึกลำดับเรียบร้อย ✅', 'success');
  }
}

function saveInvSortOrder() {
  try {
    var order = state.items.map(function(it) { return it.name; });
    localStorage.setItem('inv_item_order', JSON.stringify(order));
    var local = loadLocalData();
    var newItems = [];
    order.forEach(function(name) {
      var item = local.items.find(function(i) { return i.name === name; });
      if (item) newItems.push(item);
    });
    local.items.forEach(function(it) {
      if (!newItems.find(function(i) { return i.name === it.name; })) newItems.push(it);
    });
    local.items = newItems;
    saveLocalData(local);
  } catch (_) {}
}

function onInvRowDragStart(e, name) {}
function onInvRowDragEnd(e) {}
function onInvRowDragOver(e) {}
function onInvRowDragLeave(e) {}
function onInvRowDrop(e, targetName) {}
`;

// 1. Overwrite sort-mode.js
fs.writeFileSync('C:/Users/HP/Desktop/Antigravity/Master Portal/public/apps/store-dragdrop/sort-mode.js', sortModeJs);
console.log('sort-mode.js replaced');

// 2. Replace the equivalent section in JavaScript.html
let jsHtml = fs.readFileSync('C:/Users/HP/Desktop/Antigravity/Store Drag&Drop/Store manager V1/JavaScript.html', 'utf8');
const startToken = '// ====== INVENTORY SORT MODE ======';

const idxStart = jsHtml.indexOf(startToken);
// Find end of saveInvSortOrder
const endMatch = jsHtml.substring(idxStart).match(/catch \(\_\) \{\}\n\}/);
if (idxStart !== -1 && endMatch) {
  const idxEnd = idxStart + endMatch.index + endMatch[0].length;
  // Also remove the old native drag stubs that were trailing
  const furtherMatch = jsHtml.substring(idxEnd).match(/function onInvRowDrop\(e, targetName\) \{\s*if \(\!_sortState\.active\) return;\s*e\.preventDefault\(\);\s*e\.currentTarget\.classList\.remove\('drag-over-row'\);\s*var fromName = _sortState\.draggingItemName;\s*_sortState\.draggingItemName = null;\s*if \(!fromName \|\| fromName === targetName\) return;\s*var fromIdx = state\.items\.findIndex\(function\(it\) \{ return it\.name === fromName; \}\);\s*var toIdx = state\.items\.findIndex\(function\(it\) \{ return it\.name === targetName; \}\);\s*if \(fromIdx === -1 \|\| toIdx === -1\) return;\s*var moved = state\.items\.splice\(fromIdx, 1\)\[0\];\s*state\.items\.splice\(toIdx, 0, moved\);\s*renderInventoryList\(\);\s*\}/);
  
  // Actually, to make it simple, let's just do a string replace of the entire old block.
  // The simplest is to just overwrite the whole block from startToken to the next section "// ====== SETTINGS & MODALS ======"
  
  const nextSectionToken = '// ====== SETTINGS & MODALS ======';
  const idxNext = jsHtml.indexOf(nextSectionToken);
  if (idxNext !== -1) {
     jsHtml = jsHtml.substring(0, idxStart) + sortModeJs + "\n\n" + jsHtml.substring(idxNext);
     fs.writeFileSync('C:/Users/HP/Desktop/Antigravity/Store Drag&Drop/Store manager V1/JavaScript.html', jsHtml);
     console.log('JavaScript.html replaced sort-mode');
  }
} else {
  console.log('Could not find sort mode block in JavaScript.html');
}
