const fs = require('fs');

const frontendLogic = `function openMoveModal() {
  document.getElementById('modalRouteInfo').textContent = state.sourceLocation + ' → ' + state.destLocation;
  updateMoveStepBar();
  
  var srcItems = state.items.filter(function(it) { return (it.quantities[state.sourceLocation] || 0) > 0; });
  
  var container = document.getElementById('moveItemsContainer');
  if (srcItems.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">ไม่มีรายการสิ่งของในต้นทาง</div>';
  } else {
    container.innerHTML = srcItems.map(function(it) {
      var sQty = it.quantities[state.sourceLocation] || 0;
      var dQty = it.quantities[state.destLocation] || 0;
      return '<div class="inv-row" style="background:rgba(15,23,42,0.4);border-radius:10px;margin-bottom:6px;padding:8px 10px;">' +
             '<div class="inv-row-name">' +
             '<div class="inv-item-name">' + esc(it.name) + '</div>' +
             '<div class="inv-item-sub">ต้นทาง: <span style="color:#60a5fa;font-weight:bold;">' + sQty + '</span> | ปลายทาง: <span style="color:#4ade80;">' + dQty + '</span> ' + esc(it.unit) + '</div>' +
             '</div>' +
             '<div class="inv-row-right">' +
             '<input type="number" class="form-input move-bulk-qty" data-item="' + esc(it.name) + '" data-max="' + sQty + '" placeholder="0" min="0" max="' + sQty + '" style="width:70px;padding:6px;text-align:center;font-size:14px;font-weight:bold;" />' +
             '</div></div>';
    }).join('');
  }
  
  // Set default date to today
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var yyyy = today.getFullYear();
  document.getElementById('moveDate').value = yyyy + '-' + mm + '-' + dd;
  
  document.getElementById('moveSender').value = '';
  document.getElementById('moveReceiver').value = '';
  document.getElementById('moveCarrier').value = '';
  document.getElementById('moveReporter').value = '';
  document.getElementById('moveRemark').value = '';
  
  var btn = document.getElementById('confirmMoveBtn');
  if (btn) { btn.disabled = false; btn.textContent = '✅ ยืนยันการขนย้าย'; }
  document.getElementById('moveModal').style.display = 'flex';
}

function onMoveItemChange() {
  // Not used in bulk move
}

function closeMoveModal(e) {
  if (e && e.target !== document.getElementById('moveModal')) return;
  closeMoveModalDirect();
}
function closeMoveModalDirect() {
  document.getElementById('moveModal').style.display = 'none';
  cancelMove();
}

async function confirmMove() {
  var inputs = document.querySelectorAll('.move-bulk-qty');
  var moves = [];
  inputs.forEach(function(inp) {
    var q = parseInt(inp.value, 10);
    if (!isNaN(q) && q > 0) {
      moves.push({ itemName: inp.dataset.item, quantity: q });
    }
  });
  
  if (moves.length === 0) {
    showToast('กรุณาระบุจำนวนอย่างน้อย 1 รายการ', 'error');
    return;
  }
  
  var moveDate = document.getElementById('moveDate').value;
  var sender = document.getElementById('moveSender').value;
  var receiver = document.getElementById('moveReceiver').value;
  var carrier = document.getElementById('moveCarrier').value;
  var reporter = document.getElementById('moveReporter').value;
  var remark = document.getElementById('moveRemark').value;
  
  var btn = document.getElementById('confirmMoveBtn');
  btn.disabled = true; btn.textContent = '⏳ กำลังบันทึก...';
  
  try {
    var res = await apiPost('/api/inventory/move-bulk', {
      moves: moves,
      fromLocation: state.sourceLocation, 
      toLocation: state.destLocation,
      date: moveDate,
      sender: sender,
      receiver: receiver,
      carrier: carrier, 
      reporter: reporter, 
      remark: remark
    });
    showToast(res.message, 'success');
    document.getElementById('moveModal').style.display = 'none';
    cancelMove(); 
    await loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.textContent = '✅ ยืนยันการขนย้าย';
  }
}`;

const backendLogic = `
    if (pathStr === '/api/inventory/move-bulk') {
      const moves = body.moves;
      if (!moves || moves.length === 0) throw new Error('ไม่มีรายการขนย้าย');
      
      const histories = [];
      const d = body.date ? new Date(body.date).toISOString() : new Date().toISOString();
      
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const { data: items, error: err1 } = await supabaseClient.from('store_items').select('*').eq('name', m.itemName);
        if (err1) throw err1;
        if (!items || items.length === 0) throw new Error('ไม่พบรายการ ' + m.itemName);
        
        const item = items[0];
        const qty = Number(m.quantity);
        const cf = item.quantities[body.fromLocation] || 0;
        if (cf < qty) throw new Error('ยอด ' + m.itemName + ' ไม่พอ (มี ' + cf + ')');
        
        item.quantities[body.fromLocation] = cf - qty;
        item.quantities[body.toLocation] = (item.quantities[body.toLocation] || 0) + qty;
        
        const { error: err2 } = await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
        if (err2) throw err2;
        
        let fullRemark = body.remark || '';
        if (body.sender) fullRemark = '[ผู้ส่ง: ' + body.sender + '] ' + fullRemark;
        
        histories.push({
          date: d,
          type: 'ขนย้าย',
          itemName: m.itemName,
          quantity: qty,
          fromLocation: body.fromLocation,
          toLocation: body.toLocation,
          carrier: body.carrier || '',
          receiver: body.receiver || '',
          reporter: body.reporter || '',
          remark: fullRemark,
          balanceFrom: item.quantities[body.fromLocation],
          balanceTo: item.quantities[body.toLocation]
        });
      }
      
      const { error: err3 } = await supabaseClient.from('store_history').insert(histories);
      if (err3) throw err3;
      
      return { success: true, message: 'ขนย้าย ' + moves.length + ' รายการเรียบร้อย' };
    }

    if (pathStr === '/api/inventory/move') {`;

function patchAppJs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace frontend logic
  const feStart = 'function openMoveModal() {';
  const feEnd = '// ====== ADD ITEM MODAL ======';
  const iStart = content.indexOf(feStart);
  const iEnd = content.indexOf(feEnd);
  
  if (iStart !== -1 && iEnd !== -1) {
    content = content.substring(0, iStart) + frontendLogic + '\n\n' + content.substring(iEnd);
  }
  
  // Replace backend logic
  const beStart = 'if (pathStr === \'/api/inventory/move\') {';
  const beIdx = content.indexOf(beStart);
  if (beIdx !== -1) {
    content = content.substring(0, beIdx) + backendLogic.trim() + ' {' + content.substring(beIdx + beStart.length);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(filePath + ' patched logic');
}

patchAppJs('C:/Users/HP/Desktop/Antigravity/Master Portal/public/apps/store-dragdrop/app.js');
patchAppJs('C:/Users/HP/Desktop/Antigravity/Store Drag&Drop/Store manager V1/app.js');
