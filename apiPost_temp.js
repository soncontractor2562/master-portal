async function apiPost(pathStr, body) {
  try {
    if (!supabaseClient) throw new Error("Supabase is not initialized.");
    // (Omitted other post commands for brevity in this fallback testing, wait no, I MUST include them all!)
    

    const restrictedActions = [
      '/api/inventory/rename-item',
      '/api/inventory/change-item-category',
      '/api/locations/rename',
      '/api/categories/rename',
      '/api/inventory/delete-item',
      '/api/categories/delete',
      '/api/locations/delete'
    ];
    if (restrictedActions.includes(pathStr)) {
      if (!state.currentUser || state.currentUser.role === 'ผู้ใช้งาน') {
        throw new Error('ไม่มีสิทธิ์ดำเนินการ (เฉพาะผู้ดูแลสโตร์ หรือ แอดมิน)');
      }
    }

    if (pathStr === '/api/pending/cancel') {
      const { id } = body;
      const { data: moves, error: err1 } = await supabaseClient.from('store_pending_moves').select('*').eq('id', id);
      if (err1) throw err1;
      if (!moves || moves.length === 0) throw new Error('ไม่พบรายการรอรับนี้');
      const move = moves[0];
      
      if (move.status !== 'รอรับ') {
        throw new Error('รายการนี้ไม่อยู่ในสถานะรอรับแล้ว');
      }
      
      for (const m of move.items) {
        if (move.from_location === 'ปรับยอด') continue; // Do not refund adjustments to dummy location
        
        const { data: itemsDB, error: err2 } = await supabaseClient.from('store_items').select('*').eq('name', m.itemName);
        if (err2) throw err2;
        if (!itemsDB || itemsDB.length === 0) continue;
        const item = itemsDB[0];
        
        const qSent = Number(m.quantitySent || 0);
        item.quantities[move.from_location] = (item.quantities[move.from_location] || 0) + qSent;
        
        const { error: err3 } = await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
        if (err3) throw err3;
      }
      
      const { error: err4 } = await supabaseClient.from('store_pending_moves').delete().eq('id', id);
      if (err4) throw err4;
      
      return { success: true, message: 'ยกเลิกรายการขนย้ายสำเร็จ (คืนยอดกลับต้นทาง)' };
    }

    if (pathStr === '/api/pending/receive') {
      const { id, items } = body;
      const { data: oldMoveData } = await supabaseClient.from('store_pending_moves').select('*').eq('id', id);
      if (oldMoveData && oldMoveData.length > 0) {
        const oldMove = oldMoveData[0];
        for (let i = 0; i < items.length; i++) {
          const newItem = items[i];
          const oldItem = oldMove.items.find(x => x.itemName === newItem.itemName) || oldMove.items[i];
          if (oldItem) {
            const oldSent = Number(oldItem.quantitySent || 0);
            const newSent = Number(newItem.quantitySent || 0);
            if (oldSent !== newSent) {
              const diff = oldSent - newSent;
              const { data: itemDB } = await supabaseClient.from('store_items').select('*').eq('name', newItem.itemName);
              if (itemDB && itemDB.length > 0) {
                const item = itemDB[0];
                item.quantities[oldMove.from_location] = (item.quantities[oldMove.from_location] || 0) + diff;
                await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
              }
            }
          }
        }
      }
      const { error: e } = await supabaseClient.from('store_pending_moves').update({ items }).eq('id', id);
      if (e) throw e;
      return { success: true, message: 'บันทึกยอดรับแล้ว' };
    }
    
    if (pathStr === '/api/pending/complete') {
      const { move } = body;
      
      // Load old move to adjust source balance if sentQty changed
      const { data: oldMoveData } = await supabaseClient.from('store_pending_moves').select('*').eq('id', move.id);
      if (oldMoveData && oldMoveData.length > 0) {
        const oldMove = oldMoveData[0];
        for (let i = 0; i < move.items.length; i++) {
          const newItem = move.items[i];
          const oldItem = oldMove.items.find(x => x.itemName === newItem.itemName) || oldMove.items[i];
          if (oldItem) {
            const oldSent = Number(oldItem.quantitySent || 0);
            const newSent = Number(newItem.quantitySent || 0);
            if (oldSent !== newSent) {
              const diff = oldSent - newSent;
              const { data: itemDB } = await supabaseClient.from('store_items').select('*').eq('name', newItem.itemName);
              if (itemDB && itemDB.length > 0) {
                const item = itemDB[0];
                item.quantities[oldMove.from_location] = (item.quantities[oldMove.from_location] || 0) + diff;
                await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
              }
            }
          }
        }
      }
      
      const histories = [];
      for (const m of move.items) {
        const { data: itemsDB, error: err1 } = await supabaseClient.from('store_items').select('*').eq('name', m.itemName);
        if (err1) throw err1;
        if (!itemsDB || itemsDB.length === 0) continue;
        const item = itemsDB[0];
        
        item.quantities[move.to_location] = (item.quantities[move.to_location] || 0) + Number(m.quantityReceived);
        
        const { error: err2 } = await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
        if (err2) throw err2;
        
        histories.push({
          date: new Date().toISOString(),
          type: 'ขนย้าย',
          itemName: m.itemName,
          quantity: Number(m.quantityReceived),
          fromLocation: move.from_location,
          toLocation: move.to_location,
          carrier: move.carrier || '-',
          receiver: move.receiver || '-',
          reporter: move.reporter || '-',
          remark: move.rem