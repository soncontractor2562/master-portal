const fs = require('fs');
let appJs = fs.readFileSync('public/apps/store-dragdrop/app.js', 'utf8');

// Move
appJs = appJs.replace(
  `showToast(res.message, 'success');\n    document.getElementById('moveModal').style.display = 'none';`,
  `showToast(res.message, 'success');\n    document.getElementById('moveModal').style.display = 'none';\n    broadcastNotification('move', '🚚 ขนย้ายสินค้า', \`\${state.sourceLocation} ➔ \${state.destLocation} (\${moves.length} รายการ)\`, 'pending');`
);

// Adjust (Create Pending)
appJs = appJs.replace(
  `showToast(res.message, 'success');\n      document.getElementById('adjustModal').style.display = 'none';\n      await loadInventory();\n      return;\n    } catch (err) {`,
  `showToast(res.message, 'success');\n      document.getElementById('adjustModal').style.display = 'none';\n      broadcastNotification('adjust', '⚖️ ปรับยอดสต็อก', \`ขอปรับยอด \${state.adjustItem}\`, 'pending');\n      await loadInventory();\n      return;\n    } catch (err) {`
);

// Adjust (Direct)
appJs = appJs.replace(
  `showToast(res.message, 'success');\n    document.getElementById('adjustModal').style.display = 'none';\n    await loadInventory();\n  } catch (err) {`,
  `showToast(res.message, 'success');\n    document.getElementById('adjustModal').style.display = 'none';\n    broadcastNotification('adjust', '⚖️ ปรับยอดสต็อก', \`สโตร์ปรับยอด \${state.adjustItem}\`, 'history');\n    await loadInventory();\n  } catch (err) {`
);

// Receive Complete
appJs = appJs.replace(
  `var res = await apiPost('/api/pending/complete', { move: currentReceiveMove });\n        showToast(res.message, 'success');\n        closeReceiveModal();`,
  `var res = await apiPost('/api/pending/complete', { move: currentReceiveMove });\n        showToast(res.message, 'success');\n        closeReceiveModal();\n        broadcastNotification('receive', '📥 รับของเรียบร้อย', \`\${currentReceiveMove.to_location} รับของจาก \${currentReceiveMove.from_location} ครบถ้วน\`, 'history');`
);

// Receive Mismatch
appJs = appJs.replace(
  `var res = await apiPost('/api/pending/receive', { id: currentReceiveMove.id, items: updatedItems });\n      showToast('บันทึกยอดรับแล้ว (ยอดยังไม่ตรงกัน โปรดให้สโตร์ตรวจสอบ)', 'success');\n      closeReceiveModal();`,
  `var res = await apiPost('/api/pending/receive', { id: currentReceiveMove.id, items: updatedItems });\n      showToast('บันทึกยอดรับแล้ว (ยอดยังไม่ตรงกัน โปรดให้สโตร์ตรวจสอบ)', 'success');\n      closeReceiveModal();\n      broadcastNotification('mismatch', '⚠️ แจ้งเตือนด่วน', \`\${currentReceiveMove.to_location} รับของจาก \${currentReceiveMove.from_location} ไม่ครบ รอการตรวจสอบ\`, 'pending');`
);

// Force Complete (1)
appJs = appJs.replace(
  `var res = await apiPost('/api/pending/force-complete', { move: currentReceiveMove });\n    showToast(res.message, 'success');\n    closeReceiveModal();`,
  `var res = await apiPost('/api/pending/force-complete', { move: currentReceiveMove });\n    showToast(res.message, 'success');\n    closeReceiveModal();\n    broadcastNotification('lost', '❌ บันทึกของสูญหาย', \`เคลียร์รายการขนย้าย \${currentReceiveMove.from_location} ➔ \${currentReceiveMove.to_location} เรียบร้อยแล้ว\`, 'history');`
);

// Force Complete (2)
appJs = appJs.replace(
  `var res = await apiPost('/api/pending/force-complete', { move: currentReceiveMove });\n    showToast(res.message, 'success');\n    closeReceiveModal();\n    await loadPending();`,
  `var res = await apiPost('/api/pending/force-complete', { move: currentReceiveMove });\n    showToast(res.message, 'success');\n    closeReceiveModal();\n    broadcastNotification('lost', '❌ บันทึกของสูญหาย', \`เคลียร์รายการขนย้าย \${currentReceiveMove.from_location} ➔ \${currentReceiveMove.to_location} เรียบร้อยแล้ว\`, 'history');\n    await loadPending();`
);

fs.writeFileSync('public/apps/store-dragdrop/app.js', appJs);
console.log("App.js fixed successfully!");
