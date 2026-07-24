const fs = require('fs');

const newMoveModal = `<!-- ========== MODAL: MOVE ========== -->
<div class="modal-overlay" id="moveModal" onclick="closeMoveModal(event)">
  <div class="modal-sheet" style="max-width: 600px; display: flex; flex-direction: column; max-height: 95vh; padding-bottom: 20px;">
    <div class="modal-handle"></div>
    <div class="modal-title">🚛 บันทึกการขนย้าย</div>
    <div id="modalRouteInfo" style="background:rgba(15,23,42,0.7);border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:13px;font-weight:700;color:#60a5fa;text-align:center;flex-shrink:0;"></div>
    
    <!-- Move Details Form -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;flex-shrink:0;">
      <div>
        <label class="form-label">วันที่ขนของ</label>
        <input type="date" id="moveDate" class="form-input" />
      </div>
      <div>
        <label class="form-label">ระบุชื่อผู้บันทึก</label>
        <input type="text" id="moveReporter" class="form-input" placeholder="ผู้บันทึก..." />
      </div>
      <div>
        <label class="form-label">ระบุชื่อผู้ส่ง</label>
        <input type="text" id="moveSender" class="form-input" placeholder="ผู้ส่ง..." />
      </div>
      <div>
        <label class="form-label">ระบุชื่อผู้รับ</label>
        <input type="text" id="moveReceiver" class="form-input" placeholder="ผู้รับ..." />
      </div>
      <div style="grid-column: span 2;">
        <label class="form-label">ผู้ขนของ</label>
        <input type="text" id="moveCarrier" class="form-input" placeholder="ชื่อผู้ขนของ..." />
      </div>
      <div style="grid-column: span 2;">
        <label class="form-label">หมายเหตุ</label>
        <input type="text" id="moveRemark" class="form-input" placeholder="หมายเหตุเพิ่มเติม..." />
      </div>
    </div>
    
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-shrink:0;">
      <label class="form-label" style="margin-bottom:0;">รายการวัสดุ-อุปกรณ์ (ระบุจำนวนที่จะย้าย)</label>
      <button onclick="showAddItemModal(true)" style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#4ade80;padding:4px 10px;border-radius:8px;cursor:pointer;font-size:12px;font-family:'Sarabun',sans-serif;line-height:1;">+ เพิ่มของ</button>
    </div>
    
    <div id="moveItemsContainer" style="flex:1;overflow-y:auto;background:rgba(15,23,42,0.5);border:1px solid var(--border);border-radius:12px;padding:4px;margin-bottom:16px;min-height:150px;">
      <!-- items will be rendered here -->
    </div>
    
    <div style="flex-shrink:0;">
      <button id="confirmMoveBtn" class="btn-primary btn-success" onclick="confirmMove()">✅ ยืนยันการขนย้าย</button>
      <button onclick="closeMoveModalDirect()" class="btn-primary btn-ghost" style="margin-top:10px;">ยกเลิก</button>
    </div>
  </div>
</div>`;

function replaceModal(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const startMarker = '<!-- ========== MODAL: MOVE ========== -->';
  const endMarker = '<!-- ========== MODAL: ADD ITEM ========== -->';
  
  const idxStart = content.indexOf(startMarker);
  const idxEnd = content.indexOf(endMarker);
  
  if (idxStart !== -1 && idxEnd !== -1) {
    content = content.substring(0, idxStart) + newMoveModal + '\n\n' + content.substring(idxEnd);
    fs.writeFileSync(filePath, content);
    console.log(filePath + ' patched');
  } else {
    console.log('Could not find markers in ' + filePath);
  }
}

replaceModal('C:/Users/HP/Desktop/Antigravity/Master Portal/public/apps/store-dragdrop/index.html');
replaceModal('C:/Users/HP/Desktop/Antigravity/Store Drag&Drop/Store manager V1/Index.html');
