// ====== INVENTORY SORT MODE ======
// Appended as separate module to avoid conflicts with large app.js data section

var _sortState = {
  active: false,
  draggingItemName: null,
};

function toggleSortMode() {
  _sortState.active = !_sortState.active;
  var btn = document.getElementById('sortToggleBtn');
  var banner = document.getElementById('sortModeBanner');
  if (_sortState.active) {
    document.body.classList.add('sort-mode');
    if (btn) btn.classList.add('btn-sort-active');
    if (banner) banner.style.display = 'block';
    enableInvRowDrag(true);
    showToast('โหมดจัดเรียง: ลาก ≡ เพื่อเรียงลำดับ', 'info');
  } else {
    document.body.classList.remove('sort-mode');
    if (btn) btn.classList.remove('btn-sort-active');
    if (banner) banner.style.display = 'none';
    enableInvRowDrag(false);
    saveInvSortOrder();
    showToast('บันทึกลำดับเรียบร้อย ✅', 'success');
  }
}

function enableInvRowDrag(enabled) {
  var rows = document.querySelectorAll('#inventoryList [data-item-name]');
  rows.forEach(function(row) {
    row.setAttribute('draggable', enabled ? 'true' : 'false');
  });
}

function onInvRowDragStart(e, name) {
  if (!_sortState.active) { e.preventDefault(); return; }
  _sortState.draggingItemName = name;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', name);
  setTimeout(function() {
    var row = document.querySelector('#inventoryList [data-item-name="' + name + '"]');
    if (row) row.classList.add('dragging-row');
  }, 10);
}

function onInvRowDragEnd(e) {
  document.querySelectorAll('.dragging-row').forEach(function(r) { r.classList.remove('dragging-row'); });
  document.querySelectorAll('.drag-over-row').forEach(function(r) { r.classList.remove('drag-over-row'); });
}

function onInvRowDragOver(e) {
  if (!_sortState.active) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  var row = e.currentTarget;
  if (row.dataset.itemName !== _sortState.draggingItemName) row.classList.add('drag-over-row');
}

function onInvRowDragLeave(e) {
  e.currentTarget.classList.remove('drag-over-row');
}

function onInvRowDrop(e, targetName) {
  if (!_sortState.active) return;
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over-row');
  var fromName = _sortState.draggingItemName;
  _sortState.draggingItemName = null;
  if (!fromName || fromName === targetName) return;

  // Reorder state.items
  var fromIdx = state.items.findIndex(function(it) { return it.name === fromName; });
  var toIdx = state.items.findIndex(function(it) { return it.name === targetName; });
  if (fromIdx === -1 || toIdx === -1) return;
  var moved = state.items.splice(fromIdx, 1)[0];
  state.items.splice(toIdx, 0, moved);
  renderInventoryList();
  enableInvRowDrag(true); // re-enable drag after re-render
}

function saveInvSortOrder() {
  try {
    var order = state.items.map(function(it) { return it.name; });
    localStorage.setItem('inv_item_order', JSON.stringify(order));
    // Also update local data store order
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

// Apply saved item order on load
document.addEventListener('DOMContentLoaded', function() {
  // This runs after app.js DOMContentLoaded, so we hook into loadInventory completion
  // by wrapping the renderInventoryList function to apply saved order
  var origRenderInventoryList = window.renderInventoryList;
  if (origRenderInventoryList) {
    window.renderInventoryList = function() {
      // Apply saved order to state.items before rendering
      try {
        var savedOrder = localStorage.getItem('inv_item_order');
        if (savedOrder) {
          var order = JSON.parse(savedOrder);
          var ordered = [];
          order.forEach(function(name) {
            var item = state.items.find(function(i) { return i.name === name; });
            if (item) ordered.push(item);
          });
          state.items.forEach(function(it) {
            if (!ordered.find(function(i) { return i.name === it.name; })) ordered.push(it);
          });
          state.items = ordered;
        }
      } catch (_) {}
      origRenderInventoryList();
    };
  }
});
