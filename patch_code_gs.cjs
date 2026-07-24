const fs = require('fs');

const moveInventoryBulkLogic = `
// ====== API: MOVE INVENTORY BULK ======
function moveInventoryBulk(data) {
  try {
    var moves = data.moves;
    var fromLocation = data.fromLocation;
    var toLocation = data.toLocation;
    var moveDate = data.date || new Date().toISOString();
    var sender = data.sender || '';
    var receiver = data.receiver || '';
    var carrier = data.carrier || '';
    var reporter = data.reporter || '';
    var remark = data.remark || '';
    
    if (!moves || moves.length === 0 || !fromLocation || !toLocation) {
      throw new Error('ข้อมูลไม่ครบถ้วน');
    }
    
    var ss = getSpreadsheet();
    var regSheet = ss.getSheetByName('ทะเบียน');
    if (!regSheet) throw new Error('ไม่พบ Sheet "ทะเบียน"');
    
    var locations = getLocationsFromRegistry(regSheet);
    var fromLoc = locations.filter(function(l) { return l.name === fromLocation; })[0];
    var toLoc = locations.filter(function(l) { return l.name === toLocation; })[0];
    
    if (!fromLoc) throw new Error('ไม่พบสถานที่ต้นทาง: ' + fromLocation);
    if (!toLoc) throw new Error('ไม่พบสถานที่ปลายทาง: ' + toLocation);
    
    var lastRow = regSheet.getLastRow();
    var itemNames = regSheet.getRange(1, 2, lastRow, 1).getValues(); // Column 2
    
    var fullRemark = remark;
    if (sender) {
      fullRemark = '[ผู้ส่ง: ' + sender + '] ' + fullRemark;
    }
    
    var dateObj = new Date(moveDate);
    
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var itemName = m.itemName;
      var quantity = Number(m.quantity);
      if (quantity <= 0) continue;
      
      var itemRowIndex = -1;
      for (var r = 2; r < lastRow; r++) {
        if (itemNames[r][0] && String(itemNames[r][0]).trim() === itemName.trim()) {
          itemRowIndex = r + 1;
          break;
        }
      }
      if (itemRowIndex === -1) throw new Error('ไม่พบรายการ: ' + itemName);
      
      var currentFrom = Number(regSheet.getRange(itemRowIndex, fromLoc.col).getValue()) || 0;
      if (currentFrom < quantity) throw new Error('ยอดต้นทาง ' + itemName + ' ไม่พอ (มี ' + currentFrom + ')');
      
      var currentTo = Number(regSheet.getRange(itemRowIndex, toLoc.col).getValue()) || 0;
      var newFrom = currentFrom - quantity;
      var newTo = currentTo + quantity;
      
      regSheet.getRange(itemRowIndex, fromLoc.col).setValue(newFrom);
      regSheet.getRange(itemRowIndex, toLoc.col).setValue(newTo);
      
      appendHistory({
        date: dateObj,
        type: 'ขนย้าย',
        itemName: itemName,
        quantity: quantity,
        fromLocation: fromLocation,
        toLocation: toLocation,
        carrier: carrier,
        receiver: receiver,
        reporter: reporter,
        remark: fullRemark,
        balanceFrom: newFrom,
        balanceTo: newTo
      });
    }
    
    SpreadsheetApp.flush();
    return { success: true, message: '✅ ขนย้าย ' + moves.length + ' รายการเรียบร้อย' };
  } catch (err) {
    Logger.log('moveInventoryBulk error: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

// ====== API: ADJUST INVENTORY ======`;

function patchCodeGs() {
  const fp = 'C:/Users/HP/Desktop/Antigravity/Store Drag&Drop/Store manager V1/Code.gs';
  let content = fs.readFileSync(fp, 'utf8');
  
  // Insert moveInventoryBulk before adjustInventory
  const target = '// ====== API: ADJUST INVENTORY ======\nfunction adjustInventory(data) {';
  const idx = content.indexOf(target);
  
  if (idx !== -1) {
    // Check if we already inserted it
    if (content.indexOf('function moveInventoryBulk(data)') === -1) {
      content = content.substring(0, idx) + moveInventoryBulkLogic.replace('// ====== API: ADJUST INVENTORY ======', target) + content.substring(idx + target.length);
    }
    
    // Patch appendHistory to use entry.date
    const ahTarget = 'new Date(), // Current timestamp';
    const ahReplace = 'entry.date || new Date(), // Current timestamp or passed date';
    content = content.replace(ahTarget, ahReplace);
    
    fs.writeFileSync(fp, content);
    console.log('Code.gs patched successfully');
  } else {
    console.log('Target not found in Code.gs');
  }
}

patchCodeGs();
