
// ====== SUPABASE ENGINE ======
const supabaseUrl = 'https://yloqjcojhvmaxfvsgpkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3FqY29qaHZtYXhmdnNncGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MDg4NDAsImV4cCI6MjA5OTk4NDg0MH0.XfSGNW22xnwckpPjjNzz8UUha3RiUJRSWXn0M27n2sk';

let supabaseClient;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
  alert("FATAL ERROR: Supabase SDK did not load. Please check your internet connection, CORS, or AdBlocker.");
}

// Fallback for any missed runGAS calls
async function runGAS(funcName, ...args) {
  console.warn("Unimplemented runGAS call:", funcName, args);
  if (funcName === 'getPendingMoves') return { pending: [] };
  if (funcName === 'verifyPin') return { valid: args[0] === '1234' }; // Fallback PIN
  return { success: false, error: "Not implemented in Supabase version: " + funcName };
}

// ====== API ======
async function apiGet(pathStr) {
  try {
    if (!supabaseClient) throw new Error("Supabase is not initialized.");
    if (pathStr.startsWith('/api/inventory')) {
      const locRes = await supabaseClient.from('store_locations').select('*').order('col', { ascending: true });
      const itemRes = await supabaseClient.from('store_items').select('*').order('row', { ascending: true });
      if (locRes.error) throw locRes.error;
      if (itemRes.error) throw itemRes.error;
      const activeLocs = (locRes.data || []).filter(l => !l.archived);
      return { success: true, locations: activeLocs, allLocations: locRes.data || [], items: itemRes.data || [] };
    }
    
    if (pathStr.startsWith('/api/pending/list')) {
      const pendingRes = await supabaseClient.from('store_pending_moves').select('*').eq('status', 'รอรับ').order('date', { ascending: false });
      if (pendingRes.error) throw pendingRes.error;
      return { success: true, pending: pendingRes.data || [] };
    }
    if (pathStr.startsWith('/api/locations')) {
      const locRes = await supabaseClient.from('store_locations').select('*').order('col', { ascending: true });
      if (locRes.error) throw locRes.error;
      return { success: true, locations: locRes.data || [] };
    }
    if (pathStr.startsWith('/api/categories')) {
      const itemRes = await supabaseClient.from('store_items').select('category');
      if (itemRes.error) throw itemRes.error;
      const cats = [...new Set((itemRes.data || []).map(i => i.category).filter(Boolean))];
      return { success: true, categories: cats };
    }
    if (pathStr.startsWith('/api/settings')) {
      return { success: true, settings: { appTitle: 'Store Manager V1' } };
    }
    if (pathStr.startsWith('/api/history')) {
      const qsStr = pathStr.split('?')[1] || '';
      const params = new URLSearchParams(qsStr);
      const page = parseInt(params.get('page')) || 1;
      const limit = parseInt(params.get('limit')) || 30;
      const loc = params.get('loc') || '';
      const item = params.get('item') || '';
      const dir = params.get('dir') || '';
      
      let countQuery = supabaseClient.from('store_history').select('*', { count: 'exact', head: true });
      let dataQuery = supabaseClient.from('store_history').select('*').order('date', { ascending: false });
      
      if (loc) {
        if (dir === 'in') {
          countQuery = countQuery.ilike('toLocation', `%${loc}%`);
          dataQuery = dataQuery.ilike('toLocation', `%${loc}%`);
        } else if (dir === 'out') {
          countQuery = countQuery.ilike('fromLocation', `%${loc}%`);
          dataQuery = dataQuery.ilike('fromLocation', `%${loc}%`);
        } else {
          countQuery = countQuery.or(`fromLocation.ilike.%${loc}%,toLocation.ilike.%${loc}%`);
          dataQuery = dataQuery.or(`fromLocation.ilike.%${loc}%,toLocation.ilike.%${loc}%`);
        }
      }
      if (item) {
        countQuery = countQuery.ilike('itemName', `%${item}%`);
        dataQuery = dataQuery.ilike('itemName', `%${item}%`);
      }
      
      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;
      
      const histRes = await dataQuery.range((page-1)*limit, (page*limit)-1);
      if (histRes.error) throw histRes.error;
      
      return { success: true, total: count || 0, history: histRes.data || [] };
    }
    return { success: true };
  } catch (err) {
    console.error("API GET ERROR:", err);
    alert("API Error (GET): " + err.message);
    throw err;
  }
}

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
          remark: move.remark || '',
          balanceFrom: item.quantities[move.from_location] || 0,
          balanceTo: item.quantities[move.to_location] || 0
        });
      }
      
      if (histories.length > 0) {
        const { error: insErr } = await supabaseClient.from('store_history').insert(histories);
        if (insErr) {
          console.error('History insert failed:', insErr);
          throw new Error('บันทึกประวัติล้มเหลว: ' + insErr.message);
        }
      }
      
      await supabaseClient.from('store_pending_moves').update({ status: 'เสร็จสิ้น', items: move.items }).eq('id', move.id);
      
      return { success: true, message: 'รับของเสร็จสมบูรณ์' };
    }
    
    if (pathStr === '/api/pending/force-complete') {
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
      
      // Ensure "สูญหาย" location exists
      const { data: locs } = await supabaseClient.from('store_locations').select('*').eq('name', 'สูญหาย');
      if (!locs || locs.length === 0) {
        await supabaseClient.from('store_locations').insert([{ name: 'สูญหาย', type: 'สูญหาย', col: 99, archived: false, hideCount: true }]);
      }
      
      const histories = [];
      for (const m of move.items) {
        const { data: itemsDB, error: err1 } = await supabaseClient.from('store_items').select('*').eq('name', m.itemName);
        if (err1) throw err1;
        if (!itemsDB || itemsDB.length === 0) continue;
        const item = itemsDB[0];
        
        const qRcv = Number(m.quantityReceived || 0);
        const qSent = Number(m.quantitySent || 0);
        const diff = qSent - qRcv;
        
        if (move.from_location === 'ปรับยอด') {
          const prev = item.quantities[move.to_location] || 0;
          item.quantities[move.to_location] = qRcv;
          histories.push({
            date: new Date().toISOString(),
            type: 'ปรับยอด',
            itemName: m.itemName,
            quantity: Math.abs(qRcv - prev),
            fromLocation: move.to_location,
            toLocation: move.to_location,
            receiver: move.receiver || '-',
            reporter: move.reporter,
            remark: (move.remark || '') + ' [ยืนยันการปรับ]',
            balanceFrom: prev,
            balanceTo: qRcv
          });
        } else {
          if (qRcv > 0) {
            item.quantities[move.to_location] = (item.quantities[move.to_location] || 0) + qRcv;
            histories.push({
              date: new Date().toISOString(),
              type: 'ขนย้าย',
              itemName: m.itemName,
              quantity: qRcv,
              fromLocation: move.from_location,
              toLocation: move.to_location,
              receiver: move.receiver || '-',
              reporter: move.reporter,
              remark: move.remark + (move.receiveDate ? ' [รับจริง: ' + (function(d){var _d=new Date(d);return _d.getDate().toString().padStart(2,'0')+'/'+(_d.getMonth()+1).toString().padStart(2,'0')+'/'+(_d.getFullYear()+543);})(move.receiveDate) + (move.receiver && move.receiver !== '-' ? ' โดย ' + move.receiver : '') + ']' : ''),
              balanceFrom: item.quantities[move.from_location] || 0,
              balanceTo: item.quantities[move.to_location] || 0
            });
          }
          
          if (diff > 0) {
            item.quantities['สูญหาย'] = (item.quantities['สูญหาย'] || 0) + diff;
            histories.push({
              date: new Date().toISOString(),
              type: 'สูญหาย',
              itemName: m.itemName,
              quantity: diff,
              fromLocation: move.from_location,
              toLocation: 'สูญหาย',
              receiver: move.receiver || '-',
              reporter: move.reporter,
              remark: 'ยอดขาดจากการส่ง' + (move.receiveDate ? ' [รับจริง: ' + (function(d){var _d=new Date(d);return _d.getDate().toString().padStart(2,'0')+'/'+(_d.getMonth()+1).toString().padStart(2,'0')+'/'+(_d.getFullYear()+543);})(move.receiveDate) + (move.receiver && move.receiver !== '-' ? ' โดย ' + move.receiver : '') + ']' : ''),
              balanceFrom: (item.quantities['สูญหาย'] || 0) - diff,
              balanceTo: item.quantities['สูญหาย'] || 0
            });
          }
        }
        
        await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
      }
      
      if (histories.length > 0) {
        await supabaseClient.from('store_history').insert(histories);
      }
      
      await supabaseClient.from('store_pending_moves').update({ status: 'เสร็จสิ้น', items: move.items }).eq('id', move.id);
      
      return { success: true, message: 'จบงานสำเร็จ (บันทึกส่วนที่หายลง สูญหาย แล้ว)' };
    }
    if (pathStr === '/api/inventory/move-bulk') {
      const moves = body.moves;
      if (!moves || moves.length === 0) throw new Error('ไม่มีรายการขนย้าย');
      
      let fullRemark = body.remark || '';
      if (body.sender) fullRemark = '[ผู้ส่ง: ' + body.sender + '] ' + fullRemark;
      if (body.date) fullRemark += ' [รับจริง: ' + (function(d){var _d=new Date(d);return _d.getDate().toString().padStart(2,'0')+'/'+(_d.getMonth()+1).toString().padStart(2,'0')+'/'+(_d.getFullYear()+543);})(body.date) + (body.receiver && body.receiver !== '-' ? ' โดย ' + body.receiver : '') + ']';
      
      const d = new Date().toISOString(); // ALWAYS use current timestamp for history and pending
      
      // เช็คว่าปลายทางเป็นไซต์งานหรือไม่
      const { data: locs, error: locErr } = await supabaseClient.from('store_locations').select('*').eq('name', body.toLocation);
      if (locErr) throw locErr;
      const isSite = locs && locs.length > 0 && locs[0].type === 'ไซต์งาน';
      
      const pendingItems = [];
      const histories = [];
      
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
        
        if (isSite) {
          // ถ้าเป็นไซต์งาน ให้ไปรอรับ (Pending)
          const { error: err2 } = await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
          if (err2) throw err2;
          
          pendingItems.push({
            itemName: m.itemName,
            quantitySent: qty
          });
        } else {
          // ถ้าไม่ใช่ไซต์งาน บวกปลายทางทันที
          item.quantities[body.toLocation] = (item.quantities[body.toLocation] || 0) + qty;
          const { error: err2 } = await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
          if (err2) throw err2;
          
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
            balanceFrom: cf - qty,
            balanceTo: item.quantities[body.toLocation]
          });
        }
      }
      
      if (isSite) {
        const { error: err3 } = await supabaseClient.from('store_pending_moves').insert([{
          date: d,
          from_location: body.fromLocation,
          to_location: body.toLocation,
          reporter: body.reporter || '',
          carrier: body.carrier || '',
          remark: fullRemark,
          items: pendingItems,
          status: 'รอรับ'
        }]);
        if (err3) throw err3;
        return { success: true, message: 'ส่งรายการ ' + moves.length + ' ชิ้นไปที่รอรับแล้ว' };
      } else {
        if (histories.length > 0) {
          const { error: err3 } = await supabaseClient.from('store_history').insert(histories);
          if (err3) throw err3;
        }
        return { success: true, message: 'ขนย้าย ' + moves.length + ' ชิ้นเสร็จสมบูรณ์' };
      }
    }

    if (pathStr === '/api/inventory/move') {
      const { data: items, error: err1 } = await supabaseClient.from('store_items').select('*').eq('name', body.itemName);
      if (err1) throw err1;
      if (!items || items.length === 0) throw new Error('ไม่พบรายการ ' + body.itemName);
      const item = items[0];
      const qty = Number(body.quantity);
      const cf = item.quantities[body.fromLocation] || 0;
      if (cf < qty) throw new Error('ยอดต้นทางไม่พอ (มี ' + cf + ')');
      item.quantities[body.fromLocation] = cf - qty;
      item.quantities[body.toLocation] = (item.quantities[body.toLocation] || 0) + qty;
      const { error: err2 } = await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
      if (err2) throw err2;
      const { error: err3 } = await supabaseClient.from('store_history').insert([{
        date: new Date().toISOString(), type: 'ขนย้าย', itemName: body.itemName, quantity: qty,
        fromLocation: body.fromLocation, toLocation: body.toLocation, carrier: body.carrier || '',
        receiver: body.receiver || '', reporter: body.reporter || body.carrier || '', remark: body.remark || '',
        balanceFrom: item.quantities[body.fromLocation], balanceTo: item.quantities[body.toLocation]
      }]);
      if (err3) throw err3;
      return { success: true, message: 'ขนย้าย ' + body.itemName + ' จำนวน ' + qty + ' เรียบร้อย' };
    }

    if (pathStr === '/api/pending/create-adjust') {
        const d = new Date().toISOString();
        const { error: err3 } = await supabaseClient.from('store_pending_moves').insert([{
          date: d,
          from_location: 'ปรับยอด',
          to_location: body.location,
          reporter: body.adjusterName,
          carrier: '-',
          remark: body.remark || 'รอการอนุมัติปรับยอด',
          items: [{ itemName: body.itemName, quantitySent: body.newQuantity, quantityReceived: body.newQuantity, currentQty: body.currentQty }],
          status: 'รอรับ'
        }]);
        if (err3) throw err3;
        return { success: true, message: 'ส่งคำขอปรับยอดไปที่รอรับแล้ว' };
      }
      
      if (pathStr === '/api/inventory/adjust') {
      const { data: items, error: err1 } = await supabaseClient.from('store_items').select('*').eq('name', body.itemName);
      if (err1) throw err1;
      if (!items || items.length === 0) throw new Error('ไม่พบรายการ ' + body.itemName);
      const item = items[0];
      const prev = item.quantities[body.location] || 0;
      const newQ = Number(body.newQuantity);
      item.quantities[body.location] = newQ;
      const { error: err2 } = await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
      if (err2) throw err2;
      const { error: err3 } = await supabaseClient.from('store_history').insert([{
        date: new Date().toISOString(), type: 'ปรับยอด', itemName: body.itemName, quantity: Math.abs(newQ - prev),
        fromLocation: body.location, reporter: body.adjusterName, remark: body.remark || '',
        balanceFrom: prev, balanceTo: newQ
      }]);
      if (err3) throw err3;
      return { success: true, message: 'ปรับยอด ' + body.itemName + ' เป็น ' + newQ + ' เรียบร้อย' };
    }

    

    if (pathStr === '/api/inventory/delete-item') {
      const { error: err1 } = await supabaseClient.from('store_items').delete().eq('name', body.itemName);
      if (err1) throw err1;
      return { success: true, message: 'ลบวัสดุเรียบร้อยแล้ว' };
    }
    
    if (pathStr === '/api/categories/delete') {
      const { error: err1 } = await supabaseClient.from('store_items').update({ category: '' }).eq('category', body.name);
      if (err1) throw err1;
      return { success: true, message: 'ลบหมวดหมู่เรียบร้อยแล้ว' };
    }
    
    if (pathStr === '/api/locations/delete') {
      const { error: err1 } = await supabaseClient.from('store_locations').delete().eq('name', body.name);
      if (err1) throw err1;
      return { success: true, message: 'ลบสถานที่เรียบร้อยแล้ว' };
    }
    if (pathStr === '/api/inventory/rename-item') {
      const { oldName, newName } = body;
      const { data: exist, error: e1 } = await supabaseClient.from('store_items').select('*').eq('name', newName);
      if (e1) throw e1;
      if (exist && exist.length > 0) throw new Error('มีชื่อนี้แล้ว');
      const { error: e2 } = await supabaseClient.from('store_items').update({ name: newName }).eq('name', oldName);
      if (e2) throw e2;
      
      // Cascade to history
      await supabaseClient.from('store_history').update({ itemName: newName }).eq('itemName', oldName);
      
      // Cascade to pending moves
      const { data: pendingMoves } = await supabaseClient.from('store_pending_moves').select('*');
      if (pendingMoves) {
        for (const pm of pendingMoves) {
          let modified = false;
          const newItems = pm.items.map(m => {
            if (m.itemName === oldName) { modified = true; return Object.assign({}, m, { itemName: newName }); }
            return m;
          });
          if (modified) {
            await supabaseClient.from('store_pending_moves').update({ items: newItems }).eq('id', pm.id);
          }
        }
      }
      
      return { success: true, message: 'เปลี่ยนชื่อเป็น ' + newName + ' สำเร็จ (อัปเดตประวัติทั้งหมดแล้ว)' };
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
      
      // Cascade to history
      await supabaseClient.from('store_history').update({ fromLocation: newName }).eq('fromLocation', oldName);
      await supabaseClient.from('store_history').update({ toLocation: newName }).eq('toLocation', oldName);
      
      // Cascade to pending moves
      await supabaseClient.from('store_pending_moves').update({ from_location: newName }).eq('from_location', oldName);
      await supabaseClient.from('store_pending_moves').update({ to_location: newName }).eq('to_location', oldName);
      
      return { success: true, message: 'เปลี่ยนชื่อสถานที่เป็น ' + newName + ' สำเร็จ (อัปเดตประวัติทั้งหมดแล้ว)' };
    }

    if (pathStr === '/api/inventory/add-item') {
      const { data: items, error: err1 } = await supabaseClient.from('store_items').select('*').eq('name', body.name);
      if (err1) throw err1;
      if (items && items.length > 0) throw new Error('มีรายการนี้อยู่แล้ว');
      const { data: locs, error: err2 } = await supabaseClient.from('store_locations').select('*');
      if (err2) throw err2;
      const qs = {};
      if (locs) locs.forEach(l => qs[l.name] = 0);
      if (body.initLoc && body.initQty > 0) {
        qs[body.initLoc] = body.initQty;
      }
      const { data: maxRowItem, error: err3 } = await supabaseClient.from('store_items').select('row').order('row', { ascending: false }).limit(1);
      if (err3) throw err3;
      const nextRow = (maxRowItem && maxRowItem.length > 0 ? maxRowItem[0].row : 0) + 1;
      const { data: inserted, error: err4 } = await supabaseClient.from('store_items').insert([{
        row: nextRow, category: body.category || 'ทั่วไป', name: body.name, unit: body.unit || 'ชิ้น', quantities: qs, note: body.note || ''
      }]).select();
      if (err4) throw err4;
      if (body.initLoc && body.initQty > 0) {
        await supabaseClient.from('store_history').insert([{
          date: new Date().toISOString(),
          type: 'ตั้งยอดยกมา',
          itemName: body.name,
          quantity: body.initQty,
          fromLocation: body.initLoc,
          toLocation: '',
          balanceFrom: 0,
          balanceTo: body.initQty,
          reporter: 'System',
          remark: 'ตั้งยอดเริ่มต้น'
        }]);
      }
      return { success: true, message: 'เพิ่มรายการ ' + body.name + ' เรียบร้อย' };
    }
    
    if (pathStr === '/api/inventory/change-item-category') {
      const { itemName, newCategory } = body;
      const { error: e } = await supabaseClient.from('store_items').update({ category: newCategory }).eq('name', itemName);
      if (e) throw e;
      return { success: true, message: 'เปลี่ยนหมวดหมู่เป็น ' + newCategory + ' สำเร็จ' };
    }

    if (pathStr === '/api/locations/add') {
      const { data: locs, error: err1 } = await supabaseClient.from('store_locations').select('*').eq('name', body.name);
      if (err1) throw err1;
      if (locs && locs.length > 0) throw new Error('มีสถานที่นี้อยู่แล้ว');
      const { data: maxColLoc, error: err2 } = await supabaseClient.from('store_locations').select('col').order('col', { ascending: false }).limit(1);
      if (err2) throw err2;
      const nextCol = (maxColLoc && maxColLoc.length > 0 ? maxColLoc[0].col : 0) + 1;
      const { error: err3 } = await supabaseClient.from('store_locations').insert([{
        name: body.name, type: body.type || 'ไซต์งาน', col: nextCol, archived: false, hideCount: false
      }]);
      if (err3) throw err3;
      return { success: true, message: 'เพิ่มสถานที่ ' + body.name + ' เรียบร้อย' };
    }

    if (pathStr === '/api/locations/archive') {
      const { error: err1 } = await supabaseClient.from('store_locations').update({ archived: body.archived }).eq('name', body.name);
      if (err1) throw err1;
      return { success: true, message: 'บันทึกสถานะเรียบร้อย' };
    }

    if (pathStr === '/api/categories/rename') {
      const { error: err1 } = await supabaseClient.from('store_items').update({ category: body.newName }).eq('category', body.oldName);
      if (err1) throw err1;
      return { success: true, message: 'เปลี่ยนชื่อหมวดหมู่เรียบร้อย' };
    }

    if (pathStr === '/api/history/undo') {
      let histQuery = supabaseClient.from('store_history').select('*');
      if (body && body.id) {
        histQuery = histQuery.eq('id', body.id);
      } else {
        histQuery = histQuery.order('date', { ascending: false }).limit(1);
      }
      const { data: hist, error: err1 } = await histQuery;
      if (err1) throw err1;
      if (!hist || hist.length === 0) throw new Error('ไม่มีรายการให้ยกเลิก');
      const last = hist[0];
      const { data: items, error: err2 } = await supabaseClient.from('store_items').select('*').eq('name', last.itemName);
      if (err2) throw err2;
      if (items && items.length > 0) {
        const item = items[0];
        if (last.type === 'ขนย้าย' || last.type === 'รับของเข้า' || last.type === 'สูญหาย') {
          const qty = Number(last.quantity) || 0;
          if (last.fromLocation) item.quantities[last.fromLocation] = Number(item.quantities[last.fromLocation] || 0) + qty;
          if (last.toLocation) item.quantities[last.toLocation] = Math.max(0, Number(item.quantities[last.toLocation] || 0) - qty);
        } else if (last.type === 'ปรับยอด' && last.balanceFrom !== null && last.balanceFrom !== undefined) {
          if (last.fromLocation) item.quantities[last.fromLocation] = Number(last.balanceFrom);
        }
        const { error: err3 } = await supabaseClient.from('store_items').update({ quantities: item.quantities }).eq('id', item.id);
        if (err3) throw err3;
      }
      const { error: err4 } = await supabaseClient.from('store_history').delete().eq('id', last.id);
      if (err4) throw err4;
      return { success: true, message: 'ยกเลิกรายการ "' + last.itemName + '" แล้ว (คืนยอดเดิม)' };
    }

    return { success: true };
  } catch (err) {
    console.error("API POST ERROR:", err);
    alert("API Error (POST): " + err.message);
    throw err;
  }
}


/**
 * JavaScript.html — Frontend Logic (v4)
 * Fixes: history, location mgmt, mobile inventory layout
 * New: settings (company name), category reordering, category management, dropdown
 */

// ====== STATE ======
const state = {
  settings: { companyName: '', appTitle: 'Store Manager V1' },
  locations: [],
  allLocations: [],
  items: [],
  history: [],
  historyTotal: 0,
  historyPage: 1,
  currentPage: 'move',
  locFilter: 'all',
  invLocFilter: 'all',
  searchTerm: '',
  sourceLocation: null,
  destLocation: null,
  draggedCard: null,
  adjustItem: null,
  adjustLocation: null,
  adjustCurrentQty: 0,
  reopenMoveModal: false,
  groupCollapsed: {},
  catOrder: [],          // manual category order (stored in localStorage)
  allCategories: [],     // all unique categories from server
  currentUser: null,
  pending: [],
};

// ====== INIT ======
document.addEventListener('DOMContentLoaded', function() {
  try {
    var savedGroups = localStorage.getItem('inv_group_state');
    if (savedGroups) state.groupCollapsed = JSON.parse(savedGroups);
  } catch (_) {}
  try {
    var savedOrder = localStorage.getItem('inv_cat_order');
    if (savedOrder) state.catOrder = JSON.parse(savedOrder);
  } catch (_) {}
  
  var savedUser = localStorage.getItem('inv_user');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
      document.getElementById('loginModal').style.display = 'none';
      applyUserRole();
      refreshAll();
    } catch(e) {
      document.getElementById('loginModal').style.display = 'flex';
    }
  } else {
    document.getElementById('loginModal').style.display = 'flex';
  }
});




async function doLogin() {
  var u = document.getElementById('loginUsername').value.trim();
  var p = document.getElementById('loginPin').value.trim();
  if (!u || !p) return showToast('กรุณากรอกข้อมูล', 'error');
  try {
    var { data, error } = await supabaseClient.from('store_users').select('*').eq('username', u).eq('pin', p);
    if (error) throw error;
    if (data && data.length > 0) {
      state.currentUser = data[0];
      localStorage.setItem('inv_user', JSON.stringify(state.currentUser));
      document.getElementById('loginModal').style.display = 'none';
      showToast('เข้าสู่ระบบสำเร็จ', 'success');
        applyUserRole();
        refreshAll();
        initPushNotifications();
        fetchNotifications();
    } else {
      showToast('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
}

function logout() {
  localStorage.removeItem('inv_user');
  location.reload();
}

function applyUserRole() {
  if (!state.currentUser) return;
  var r = state.currentUser.role;
  var isUser = (r === 'ผู้ใช้งาน');
  
  if (document.getElementById('addInventoryBtn')) {
    document.getElementById('addInventoryBtn').style.display = isUser ? 'none' : 'block';
  }
  if (document.getElementById('nav-move')) {
    document.getElementById('nav-move').style.display = 'flex';
  }
  if (document.getElementById('snav-move')) {
    document.getElementById('snav-move').style.display = 'flex';
  }
  
  if (isUser && state.currentPage === 'move') {
    switchPage('pending');
  } else if (!isUser && state.currentPage === 'pending') {
    // switchPage('move');
  }
  
  // Update username UI
  if (document.getElementById('settingsUser')) {
    document.getElementById('settingsUser').innerText = state.currentUser.name || state.currentUser.username;
  }
}

async function refreshAll() {
  var btn = document.getElementById('refreshBtn');
  if (btn) { btn.innerHTML = '⏳'; btn.disabled = true; }
  try {
    // Load settings, inventory, and pending in parallel
    var [settingsRes, _, __] = await Promise.all([
      apiGet('/api/settings').catch(function(){ return { settings: {} }; }),
      loadInventory(),
      (typeof loadPending === 'function' ? loadPending() : Promise.resolve())
    ]);
    if (settingsRes && settingsRes.settings) {
      state.settings = settingsRes.settings;
      updateAppTitles();
    }
    var el = document.getElementById('lastUpdate');
    if (el) el.textContent = 'อัปเดต ' + formatTime(new Date());
    var sideEl = document.getElementById('sidebarUpdate');
    if (sideEl) sideEl.textContent = 'อัปเดต ' + formatTime(new Date());
  } catch (e) {
    showToast('โหลดข้อมูลล้มเหลว: ' + e.message, 'error');
  } finally {
    if (btn) { btn.innerHTML = '🔄'; btn.disabled = false; }
  }
}

function updateAppTitles() {
  var company = state.settings.companyName || '';
  var companyEls = document.querySelectorAll('[data-company-name]');
  companyEls.forEach(function(el) { el.textContent = company; el.style.display = company ? '' : 'none'; });
}


// ====== LOAD DATA ======
async function loadInventory() {
  var data = await apiGet('/api/inventory');
  state.locations = data.locations || [];
  state.allLocations = data.locations || [];
  state.items = data.items || [];
  // Build allCategories from items
  var seen = {};
  state.items.forEach(function(it) {
    if (it.category && !seen[it.category]) { seen[it.category] = true; }
  });
  state.allCategories = Object.keys(seen);
  renderLocationCards();
  renderInventoryList();
  renderInventoryLocationFilter();
}

let histFilterTimeout = null;
function filterHistory() {
  if (histFilterTimeout) clearTimeout(histFilterTimeout);
  histFilterTimeout = setTimeout(function() {
    loadHistory(true);
  }, 500);
}

async function loadHistory(reset) {
  if (reset === undefined) reset = true;
  if (reset) { state.historyPage = 1; state.history = []; }
  
  var loc = document.getElementById('histFilterLoc') ? document.getElementById('histFilterLoc').value.trim() : '';
  var item = document.getElementById('histFilterItem') ? document.getElementById('histFilterItem').value.trim() : '';
  
  var dir = document.getElementById('histFilterDir') ? document.getElementById('histFilterDir').value : '';
  
  var url = '/api/history?page=' + state.historyPage + '&limit=30';
  if (loc) url += '&loc=' + encodeURIComponent(loc);
  if (item) url += '&item=' + encodeURIComponent(item);
  if (dir) url += '&dir=' + encodeURIComponent(dir);
  
  var data = await apiGet(url);
  state.historyTotal = data.total || 0;
  state.history = reset ? (data.history || []) : state.history.concat(data.history || []);
  renderHistoryList();
}

async function loadMoreHistory() {
  state.historyPage++;
  await loadHistory(false);
}

// ====== NAVIGATION ======
function switchPage(page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.sidebar-btn').forEach(function(b) { b.classList.remove('active'); });
  var pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  var navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  var sBtn = document.getElementById('snav-' + page);
  if (sBtn) sBtn.classList.add('active');
  state.currentPage = page;
  if (page === 'history') {
      updateHistoryDatalists();
      loadHistory(true);
    }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ====== LOCATION ICONS ======
function getLocIcon(loc) {
  if (!loc) return '📦';
  var name = typeof loc === 'string' ? loc : loc.name;
  var type = typeof loc === 'object' ? loc.type : null;
  if (name.includes('ร้านค้า')) return '🏪';
  if (name.includes('ร้านซ่อม') || name.includes('ซ่อม')) return '🔧';
  if (name.includes('สูญหาย') || name.includes('หาย')) return '🚫';
  if (name.includes('จำหน่าย') || name.includes('ทิ้ง') || name.includes('ตัดออก')) return '🗑️';
  if (type === 'สโตร์') return '🏬';
  if (type === 'ไซต์งาน') return '🏗️';
  return '📦';
}
function getLocBadgeClass(type) {
  if (type === 'สโตร์') return 'badge-store';
  if (type === 'ไซต์งาน') return 'badge-site';
  return 'badge-other';
}
function getLocTypeLabel(type) {
  if (type === 'สโตร์') return 'สโตร์';
  if (type === 'ไซต์งาน') return 'ไซต์งาน';
  return 'อื่นๆ';
}

// ====== RENDER LOCATION CARDS ======
function renderLocationCards() {
  var grid = document.getElementById('locGridContent');
  var filtered = getFilteredLocations();
  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#64748b;font-size:14px;">ไม่พบสถานที่<br><small style="font-size:11px;">กด ⚙️ ตั้งค่า เพื่อเพิ่มสถานที่</small></div>';
    return;
  }
  grid.innerHTML = filtered.map(function(loc) {
    var isSource = state.sourceLocation === loc.name;
    var isDest = state.destLocation === loc.name;
    var activeCount = state.items.filter(function(it) { return (it.quantities[loc.name] || 0) > 0; }).length;
    var isExternal = loc.hideCount;

    return '<div class="loc-card ' + (isSource ? 'selected-source' : '') + ' ' + (isDest ? 'selected-dest' : '') + '"' +
      ' id="loc-card-' + encId(loc.name) + '" data-location="' + loc.name + '"' +
      ' draggable="true"' +
      ' ondragstart="onDragStart(event,\'' + esc(loc.name) + '\')"' +
      ' ondragend="onDragEnd(event)"' +
      ' ondragover="onDragOver(event)"' +
      ' ondragleave="onDragLeave(event)"' +
      ' ondrop="onDrop(event,\'' + esc(loc.name) + '\')"' +
      ' onclick="onCardClick(\'' + esc(loc.name) + '\')">' +
      '<div style="padding:14px 12px;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">' +
      '<span style="font-size:24px;">' + getLocIcon(loc) + '</span>' +
      '<span class="' + getLocBadgeClass(loc.type) + '" style="font-size:10px;font-weight:700;color:white;padding:3px 8px;border-radius:99px;">' + getLocTypeLabel(loc.type) + '</span>' +
      '</div>' +
      '<div style="font-size:13px;font-weight:700;color:#e2e8f0;line-height:1.3;margin-bottom:6px;">' + loc.name + '</div>' +
      (isExternal
        ? '<div style="font-size:11px;color:#64748b;">ภายนอกบริษัท</div>'
        : '<div style="font-size:11px;color:#64748b;">' + activeCount + ' รายการ</div>') +
      '</div></div>';
  }).join('');
}

function getFilteredLocations() {
  return state.locations.filter(function(loc) {
    if (state.locFilter === 'all') return true;
    if (state.locFilter === 'store') return loc.type === 'สโตร์';
    if (state.locFilter === 'site') return loc.type === 'ไซต์งาน';
    if (state.locFilter === 'other') return loc.type !== 'สโตร์' && loc.type !== 'ไซต์งาน';
    return true;
  });
}

function filterLocations(f) {
  state.locFilter = f;
  document.querySelectorAll('[id^="locFilter-"]').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.getElementById('locFilter-' + f);
  if (btn) btn.classList.add('active');
  renderLocationCards();
}

// ====== DRAG & DROP ======
function onDragStart(e, name) {
  state.draggedCard = name;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', name);
  setTimeout(function() {
    var c = document.getElementById('loc-card-' + encId(name));
    if (c) c.classList.add('dragging');
  }, 10);
}
function onDragEnd() {
  document.querySelectorAll('.loc-card').forEach(function(c) { c.classList.remove('dragging', 'drag-over'); });
}
function onDragOver(e) {
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  if (e.currentTarget.dataset.location !== state.draggedCard) e.currentTarget.classList.add('drag-over');
}
function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onDrop(e, dest) {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  var src = state.draggedCard || e.dataTransfer.getData('text/plain');
  state.draggedCard = null;
  if (!src || src === dest) return;
  state.sourceLocation = src; state.destLocation = dest;
  openMoveModal();
}

// ====== TAP FLOW ======
function onCardClick(name) {
  if (!state.sourceLocation) {
    state.sourceLocation = name; state.destLocation = null;
    updateMoveStepBar(); renderLocationCards();
    showToast('เลือกต้นทาง: ' + name + ' ✅  แตะสถานที่ปลายทาง', 'info');
  } else if (state.sourceLocation === name) {
    cancelMove();
  } else {
    state.destLocation = name; renderLocationCards(); openMoveModal();
  }
}
function cancelMove() {
  state.sourceLocation = null; state.destLocation = null;
  updateMoveStepBar(); renderLocationCards();
}
function updateMoveStepBar() {
  var bar = document.getElementById('moveStepBar');
  var srcEl = document.getElementById('stepSourceName');
  var dstEl = document.getElementById('stepDestName');
  if (state.sourceLocation) {
    bar.style.display = 'block';
    if (srcEl) srcEl.textContent = state.sourceLocation;
    if (dstEl) dstEl.textContent = state.destLocation || 'แตะเลือก...';
  } else { bar.style.display = 'none'; }
}

// ====== MOVE MODAL ======
function openMoveModal(itemIndex) {
  notifyParentModalState(true);
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
  notifyParentModalState(false);
  if (e && e.target !== document.getElementById('moveModal')) return;
  closeMoveModalDirect();
}
function closeMoveModalDirect() {
  document.getElementById('moveModal').style.display = 'none';
  cancelMove();
}

async function confirmMove() {
  if (state.currentUser && state.currentUser.role === 'ผู้ใช้งาน') {
    showToast('ผู้ใช้งานทั่วไปไม่สามารถทำการขนย้ายได้', 'error');
    return;
  }
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
  
  var moveDateInput = document.getElementById('moveDate').value;
  var finalDateStr = new Date().toISOString();
  
  var sender = document.getElementById('moveSender').value;
  var receiver = document.getElementById('moveReceiver').value;
  var carrier = document.getElementById('moveCarrier').value;
  var reporter = document.getElementById('moveReporter').value;
  var remark = document.getElementById('moveRemark').value;
  
  if (!moveDateInput) {
    showToast('กรุณาระบุวันที่ขนของ', 'error');
    return;
  }
  if (!reporter.trim()) {
    showToast('กรุณาระบุชื่อผู้บันทึก', 'error');
    return;
  }
  if (!sender.trim()) {
    showToast('กรุณาระบุชื่อผู้ส่ง', 'error');
    return;
  }
  if (!carrier.trim()) {
    showToast('กรุณาระบุชื่อผู้ขนของ', 'error');
    return;
  }
  
  if (moveDateInput) {
    var parts = moveDateInput.split('-');
    if (parts.length === 3) {
      var displayDate = parts[2] + '/' + parts[1] + '/' + (Number(parts[0]) + 543);
      remark = '[วันที่ขนจริง: ' + displayDate + '] ' + remark;
    }
  }
  
  var btn = document.getElementById('confirmMoveBtn');
  btn.disabled = true; btn.textContent = '⏳ กำลังบันทึก...';
  
  try {
    var res = await apiPost('/api/inventory/move-bulk', {
      moves: moves,
      fromLocation: state.sourceLocation, 
      toLocation: state.destLocation,
      date: finalDateStr,
      sender: sender,
      receiver: receiver,
      carrier: carrier, 
      reporter: reporter, 
      remark: remark
    });
    showToast(res.message, 'success');
    document.getElementById('moveModal').style.display = 'none';
    broadcastNotification('move', '🚚 ขนย้ายสินค้า', `${state.sourceLocation} ➔ ${state.destLocation} (${moves.length} รายการ)`, 'pending');
    cancelMove(); 
    await loadInventory();
    await loadPending();
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.textContent = '✅ ยืนยันการขนย้าย';
  }
}

// ====== ADD ITEM MODAL ======
function showAddItemModal(fromMove) {
  fromMove = fromMove || false;
  state.reopenMoveModal = fromMove;
  updateCategoryDatalist();
  ['newItemName', 'newItemCategory', 'newItemUnit', 'newItemNote', 'newItemInitQty', 'newItemInitLoc'].forEach(function(id) {
    if (document.getElementById(id)) document.getElementById(id).value = '';
  });
  var locSelect = document.getElementById('newItemInitLoc');
  if (locSelect) {
    locSelect.innerHTML = '<option value="">-- ไม่ระบุ --</option>' + state.locations.map(function(l) {
      return '<option value="' + esc(l.name) + '">' + l.name + '</option>';
    }).join('');
  }
  if (fromMove) document.getElementById('moveModal').style.display = 'none';
  document.getElementById('addItemModal').style.display = 'flex';
  setTimeout(function() { document.getElementById('newItemName').focus(); }, 100);
}
function updateCategoryDatalist() {
  var dl = document.getElementById('categoryList');
  if (!dl) return;
  dl.innerHTML = state.allCategories.map(function(c) {
    return '<option value="' + esc(c) + '">' + c + '</option>';
  }).join('');
}
function closeAddItemModal(e) {
  if (e && e.target !== document.getElementById('addItemModal')) return;
  document.getElementById('addItemModal').style.display = 'none';
  if (state.reopenMoveModal) { state.reopenMoveModal = false; setTimeout(openMoveModal, 100); }
}
async function confirmAddItem() {
  var name = document.getElementById('newItemName').value.trim();
  var category = document.getElementById('newItemCategory').value.trim();
  var unit = document.getElementById('newItemUnit').value.trim();
  var note = document.getElementById('newItemNote').value.trim();
  var initLoc = document.getElementById('newItemInitLoc') ? document.getElementById('newItemInitLoc').value : '';
  var initQty = document.getElementById('newItemInitQty') ? Number(document.getElementById('newItemInitQty').value) : 0;
  if (!name) { showToast('กรุณาระบุชื่อสิ่งของ', 'error'); return; }
  if (!category) { showToast('กรุณาระบุหมวดหมู่', 'error'); return; }
  if (!unit) { showToast('กรุณาระบุหน่วยนับ', 'error'); return; }
  try {
    var res = await apiPost('/api/inventory/add-item', { name: name, category: category, unit: unit, note: note, initLoc: initLoc, initQty: initQty });
    showToast(res.message, 'success');
    document.getElementById('addItemModal').style.display = 'none';
    await loadInventory();
    if (state.reopenMoveModal) { state.reopenMoveModal = false; setTimeout(openMoveModal, 200); }
  } catch (err) { showToast(err.message, 'error'); }
}

// ====== INVENTORY PAGE ======
function renderInventoryLocationFilter() {
  var c = document.getElementById('invLocFilter');
  c.innerHTML = '<button class="filter-pill active" id="invLoc-all" onclick="filterInventoryByLocation(\'all\')">ทั้งหมด</button>' +
    state.locations.map(function(l) {
      return '<button class="filter-pill" id="invLoc-' + encId(l.name) + '" onclick="filterInventoryByLocation(\'' + esc(l.name) + '\')">' + l.name + '</button>';
    }).join('');
}
function filterInventoryByLocation(name) {
  state.invLocFilter = name;
  document.querySelectorAll('[id^="invLoc-"]').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.getElementById('invLoc-' + (name === 'all' ? 'all' : encId(name)));
  if (btn) btn.classList.add('active');
  renderInventoryList();
}
function filterInventory() {
  state.searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  renderInventoryList();
}

// ====== CATEGORY ORDER ======
function getCatOrder() { return state.catOrder; }
function saveCatOrder() {
  try { localStorage.setItem('inv_cat_order', JSON.stringify(state.catOrder)); } catch (_) {}
}
function getSortedCats(cats) {
  // Put ordered cats first, then remaining alphabetically
  var order = state.catOrder;
  var inOrder = order.filter(function(c) { return cats.indexOf(c) !== -1; });
  var notInOrder = cats.filter(function(c) { return order.indexOf(c) === -1; }).sort();
  return inOrder.concat(notInOrder);
}
function moveCatUp(cat) {
  var order = getSortedCats(Object.keys(getGrouped()));
  var idx = order.indexOf(cat);
  if (idx <= 0) return;
  state.catOrder = order.slice();
  // ensure all cats are in state.catOrder
  state.catOrder = order;
  var tmp = state.catOrder[idx]; state.catOrder[idx] = state.catOrder[idx - 1]; state.catOrder[idx - 1] = tmp;
  saveCatOrder(); renderInventoryList();
}
function moveCatDown(cat) {
  var order = getSortedCats(Object.keys(getGrouped()));
  var idx = order.indexOf(cat);
  if (idx < 0 || idx >= order.length - 1) return;
  state.catOrder = order.slice();
  var tmp = state.catOrder[idx]; state.catOrder[idx] = state.catOrder[idx + 1]; state.catOrder[idx + 1] = tmp;
  saveCatOrder(); renderInventoryList();
}
function getGrouped() {
  var items = getFilteredItems();
  var grouped = {};
  items.forEach(function(it) {
    var cat = it.category || 'ไม่มีหมวดหมู่';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  });
  return grouped;
}
function getFilteredItems() {
  var items = state.items;
  if (state.searchTerm) {
    items = items.filter(function(it) {
      return it.name.toLowerCase().includes(state.searchTerm) || it.category.toLowerCase().includes(state.searchTerm);
    });
  }
  if (state.invLocFilter !== 'all') {
    items = items.filter(function(it) { return (it.quantities[state.invLocFilter] || 0) > 0; });
  }
  return items;
}

function renderInventoryList() {
  var container = document.getElementById('inventoryList');
  var items = getFilteredItems();
  if (items.length === 0) {
    container.innerHTML = '<div class="glass-card" style="text-align:center;padding:40px;color:#64748b;">ไม่พบรายการ</div>';
    return;
  }
  var grouped = {};
  items.forEach(function(it) {
    var cat = it.category || 'ไม่มีหมวดหมู่';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  });
  var sortedCats = getSortedCats(Object.keys(grouped));
  var totalCats = sortedCats.length;

  container.innerHTML = sortedCats.map(function(cat, catIdx) {
    var catItems = grouped[cat];
    var collapsed = state.groupCollapsed[cat] === true;
    var isFirst = catIdx === 0;
    var isLast = catIdx === totalCats - 1;
    return '<div style="margin-bottom:12px;">' +
      '<div class="group-header" onclick="toggleGroup(\'' + esc(cat) + '\')">' +
      '<div class="group-title">' + cat + ' <span style="color:#475569;font-weight:400;font-size:10px;">(' + catItems.length + ')</span></div>' +
      '<div style="display:flex;gap:4px;align-items:center;" onclick="event.stopPropagation();">' +
      (!isFirst ? '<button class="cat-order-btn" onclick="moveCatUp(\'' + esc(cat) + '\')" title="เลื่อนขึ้น">↑</button>' : '<span style="width:24px;"></span>') +
      (!isLast ? '<button class="cat-order-btn" onclick="moveCatDown(\'' + esc(cat) + '\')" title="เลื่อนลง">↓</button>' : '<span style="width:24px;"></span>') +
      '</div>' +
      '<span class="group-chevron ' + (collapsed ? 'collapsed' : '') + '">▼</span>' +
      '</div>' +
      '<div class="glass-card inv-items-container" id="group-' + encId(cat) + '" style="' + (collapsed ? 'display:none;' : '') + '">' +
      catItems.map(function(it) { return renderInventoryRow(it); }).join('') +
      '</div></div>';
  }).join('');
}

function toggleGroup(cat) {
  var el = document.getElementById('group-' + encId(cat));
  if (!el) return;
  var chevron = el.previousElementSibling ? el.previousElementSibling.querySelector('.group-chevron') : null;
  var isCollapsed = el.style.display === 'none';
  el.style.display = isCollapsed ? '' : 'none';
  if (chevron) chevron.classList.toggle('collapsed', !isCollapsed);
  state.groupCollapsed[cat] = !isCollapsed;
  try { localStorage.setItem('inv_group_state', JSON.stringify(state.groupCollapsed)); } catch (_) {}
}

function renderInventoryRow(item) {
  var qty = state.invLocFilter !== 'all' ? (item.quantities[state.invLocFilter] || 0) :
    Object.keys(item.quantities).reduce(function(s, k) { return s + (k === 'สูญหาย' ? 0 : Math.max(0, item.quantities[k] || 0)); }, 0);
  var locCount = Object.keys(item.quantities).filter(function(k) { return k !== 'สูญหาย' && item.quantities[k] > 0; }).length;
  var sub = state.invLocFilter !== 'all' ? state.invLocFilter : locCount + ' สถานที่';

  // Qty badge style (inline - no CSS class dependency)
  var qtyBg, qtyColor, qtyBorder;
  if (qty > 0) {
    qtyBg = 'rgba(34,197,94,0.15)'; qtyColor = '#4ade80'; qtyBorder = '1px solid rgba(34,197,94,0.2)';
  } else if (qty < 0) {
    qtyBg = 'rgba(239,68,68,0.15)'; qtyColor = '#f87171'; qtyBorder = '1px solid rgba(239,68,68,0.2)';
  } else {
    qtyBg = 'rgba(51,65,85,0.3)'; qtyColor = '#64748b'; qtyBorder = '1px solid transparent';
  }

  var adjustBtn = 'event.stopPropagation();showAdjustModal(\'' +
    esc(item.name) + '\',\'' +
    esc(state.invLocFilter !== 'all' ? state.invLocFilter : '') + '\')';

  return (
    // Row container: flex, no overflow, fixed height layout
    '<div onclick="showItemDetail(\'' + esc(item.name) + '\')" style="' +
      'display:flex;align-items:center;padding:11px 12px;' +
      'border-bottom:1px solid rgba(51,65,85,0.3);cursor:pointer;' +
      'gap:10px;width:100%;box-sizing:border-box;' +
      'transition:background .15s;-webkit-tap-highlight-color:rgba(59,130,246,0.1);" ' +
      'data-item-name="' + esc(item.name) + '">' +
      '<div class="drag-handle" style="display:none;color:#94a3b8;font-size:20px;cursor:grab;padding-right:4px;">☰</div>' +

    // LEFT: name column - flex:1 min-width:0 so it shrinks and truncates
    '<div style="flex:1;min-width:0;overflow:hidden;">' +
    '<div style="font-size:13px;font-weight:600;color:#e2e8f0;' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + item.name + '</div>' +
    '<div style="font-size:11px;color:#64748b;margin-top:2px;white-space:nowrap;">' + sub + '</div>' +
    '</div>' +

    // RIGHT: qty + button - flex-shrink:0 so it never gets compressed
    '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">' +
    '<div style="text-align:center;">' +
    '<span style="display:inline-block;min-width:40px;text-align:center;' +
      'padding:4px 8px;border-radius:8px;font-size:14px;font-weight:800;' +
      'font-family:Outfit,sans-serif;' +
      'background:' + qtyBg + ';color:' + qtyColor + ';border:' + qtyBorder + ';">' + qty + '</span>' +
    '<div style="font-size:10px;color:#64748b;margin-top:2px;">' + item.unit + '</div>' +
    '</div>' +
    '<button onclick="' + adjustBtn + '" style="' +
      'background:rgba(217,119,6,0.15);border:1px solid rgba(217,119,6,0.3);' +
      'color:#fbbf24;padding:8px;border-radius:9px;cursor:pointer;' +
      'font-size:14px;flex-shrink:0;line-height:1;" title="ปรับยอด">⚖️</button>' +
    '</div>' +

    '</div>'
  );
}


// ====== ITEM DETAIL MODAL ======
function showItemDetail(itemName) {
  var item = state.items.find(function(it) { return it.name === itemName; });
  if (!item) return;
  state.currentItem = item;
  document.getElementById('detailItemName').textContent = item.name;
  var isUser = state.currentUser && state.currentUser.role === 'ผู้ใช้งาน';
  var detailRenameBtn = document.getElementById('detailRenameBtn');
  var detailChangeCatBtn = document.getElementById('detailChangeCatBtn');
  var detailDeleteItemBtn = document.getElementById('detailDeleteItemBtn');
  if (detailRenameBtn) detailRenameBtn.style.display = isUser ? 'none' : '';
  if (detailChangeCatBtn) detailChangeCatBtn.style.display = isUser ? 'none' : '';
  if (detailDeleteItemBtn) detailDeleteItemBtn.style.display = isUser ? 'none' : '';
  document.getElementById('detailItemCat').textContent = (item.category || '-') + ' · ' + item.unit;
  var total = Object.keys(item.quantities).reduce(function(s, k) { return s + (k === 'สูญหาย' ? 0 : Math.max(0, item.quantities[k] || 0)); }, 0);
  document.getElementById('detailTotalBadge').textContent = 'รวม ' + total + ' ' + item.unit;
  document.getElementById('detailLocationList').innerHTML = state.locations.map(function(loc) {
    var qty = item.quantities[loc.name] || 0;
    var qtyClass = qty > 0 ? 'qty-positive' : (qty < 0 ? 'qty-negative' : 'qty-zero');
    return '<div style="display:flex;align-items:center;padding:12px 14px;background:rgba(30,41,59,0.6);border-radius:12px;gap:12px;">' +
      '<span style="font-size:18px;">' + getLocIcon(loc) + '</span>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + loc.name + '</div>' +
      '<div style="font-size:11px;color:#64748b;">' + loc.type + '</div></div>' +
      '<div style="text-align:center;flex-shrink:0;"><span class="qty-badge ' + qtyClass + '">' + qty + '</span>' +
      '<div style="font-size:10px;color:#64748b;">' + item.unit + '</div></div>' +
      '<button onclick="showAdjustModal(\'' + esc(item.name) + '\',\'' + esc(loc.name) + '\');closeItemDetailModal();" class="adj-btn">⚖️</button>' +
      '</div>';
  }).join('');
  document.getElementById('itemDetailModal').style.display = 'flex';
}
function closeItemDetailModal(e) {
  if (e && e.target !== document.getElementById('itemDetailModal')) return;
  document.getElementById('itemDetailModal').style.display = 'none';
}

// ====== ADJUST MODAL ======
function showAdjustModal(itemName, locationName) {
  if (!locationName) { showItemDetail(itemName); return; }
  var item = state.items.find(function(it) { return it.name === itemName; });
  if (!item) return;
  var currentQty = item.quantities[locationName] || 0;
  state.adjustItem = itemName; state.adjustLocation = locationName; state.adjustCurrentQty = currentQty;
  document.getElementById('adjustItemInfo').textContent = itemName + ' · ' + locationName;
  document.getElementById('adjustCurrentQty').textContent = currentQty;
  document.getElementById('adjustUnit').textContent = item.unit;
  document.getElementById('adjustNewQty').value = '';
  document.getElementById('adjustAdjuster').value = '';
  document.getElementById('adjustRemark').value = '';
  document.getElementById('adjustDiffDisplay').style.display = 'none';
  document.getElementById('itemDetailModal').style.display = 'none';
  document.getElementById('adjustModal').style.display = 'flex';
  setTimeout(function() { document.getElementById('adjustNewQty').focus(); }, 100);
}
function calcAdjustDiff() {
  var val = document.getElementById('adjustNewQty').value;
  var diffDiv = document.getElementById('adjustDiffDisplay');
  var diffText = document.getElementById('adjustDiffText');
  if (val === '') { diffDiv.style.display = 'none'; return; }
  var diff = Number(val) - state.adjustCurrentQty;
  diffDiv.style.display = 'block';
  if (diff > 0) {
    diffDiv.className = 'diff-box diff-pos';
    diffText.textContent = '✅ เพิ่ม +' + diff + ' (จาก ' + state.adjustCurrentQty + ' → ' + Number(val) + ')';
  } else if (diff < 0) {
    diffDiv.className = 'diff-box diff-neg';
    diffText.textContent = '⚠️ ลด ' + diff + ' (จาก ' + state.adjustCurrentQty + ' → ' + Number(val) + ')';
  } else {
    diffDiv.className = 'diff-box diff-zero';
    diffText.textContent = 'ℹ️ ยอดเท่าเดิม (' + Number(val) + ')';
  }
}
function closeAdjustModal(e) {
  if (e && e.target !== document.getElementById('adjustModal')) return;
  document.getElementById('adjustModal').style.display = 'none';
}
async function confirmAdjust() {
  var newQty = document.getElementById('adjustNewQty').value;
  var adjuster = document.getElementById('adjustAdjuster').value.trim();
  var remark = document.getElementById('adjustRemark').value.trim();
  if (newQty === '' || Number(newQty) < 0) { showToast('กรุณาระบุจำนวน', 'error'); return; }
  if (!adjuster) { showToast('กรุณาระบุชื่อผู้ปรับยอด', 'error'); return; }
  
  if (state.currentUser.role === 'ผู้ใช้งาน') {
    var locObj = state.locations.find(function(l) { return l.name === state.adjustLocation; });
    var isSite = locObj && locObj.type === 'ไซต์งาน' && !locObj.name.includes('เช่า');
    if (!isSite) {
      showToast('ผู้ใช้งานปรับยอดได้เฉพาะในไซต์งานเท่านั้น', 'error');
      return;
    }
    
    try {
      var res = await apiPost('/api/pending/create-adjust', {
        itemName: state.adjustItem, location: state.adjustLocation,
        newQuantity: Number(newQty), currentQty: state.adjustCurrentQty,
        adjusterName: adjuster, remark: remark
      });
      showToast(res.message, 'success');
      document.getElementById('adjustModal').style.display = 'none';
      broadcastNotification('adjust', '⚖️ ปรับยอดสต็อก', `ขอปรับยอด ${state.adjustItem}`, 'pending');
      await loadInventory();
      return;
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  }

  try {
    var res = await apiPost('/api/inventory/adjust', {
      itemName: state.adjustItem, location: state.adjustLocation,
      newQuantity: Number(newQty), adjusterName: adjuster, remark: remark,
    });
    showToast(res.message, 'success');
    document.getElementById('adjustModal').style.display = 'none';
    broadcastNotification('adjust', '⚖️ ปรับยอดสต็อก', `สโตร์ปรับยอด ${state.adjustItem}`, 'history');
    await loadInventory();
  } catch (err) { showToast(err.message, 'error'); }
}

// ====== HISTORY PAGE ======
function renderHistoryList() {
  var container = document.getElementById('historyList');
  var countEl = document.getElementById('historyCount');
  var loadMoreEl = document.getElementById('historyLoadMore');
  if (countEl) countEl.textContent = state.historyTotal + ' รายการ';
  if (state.history.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#64748b;"><div style="font-size:40px;margin-bottom:12px;">📋</div><div>ยังไม่มีประวัติรายการ</div></div>';
    if (loadMoreEl) loadMoreEl.style.display = 'none';
    return;
  }
  var groups = [];
  state.history.forEach(function(h) {
    var added = false;
    for (var i = groups.length - 1; i >= 0; i--) {
      var cgFirst = groups[i][0];
      var timeDiff = Math.abs(new Date(h.date || 0) - new Date(cgFirst.date || 0));
      
      if (timeDiff > 300000) break; 
      
      var isSameLocation = h.fromLocation === cgFirst.fromLocation && h.toLocation === cgFirst.toLocation;
      var isSameType = h.type === cgFirst.type;
      var isSameMeta = h.reporter === cgFirst.reporter && h.carrier === cgFirst.carrier && h.remark === cgFirst.remark;

      if (isSameLocation && isSameType && isSameMeta) {
        groups[i].push(h);
        added = true;
        break;
      }
    }
    
    if (!added) {
      groups.push([h]);
    }
  });

  container.innerHTML = groups.map(function(group) {
    var first = group[0];
    var isMove = first.type === 'ขนย้าย';
    var isLost = first.type === 'สูญหาย';
    var dotColor = isMove ? '#3b82f6' : (isLost ? '#ef4444' : '#f59e0b');
    var dotEmoji = isMove ? '🚛' : (isLost ? '🚫' : '⚖️');
    var dateStr = first.date ? formatDate(new Date(first.date)) : '-';
    
    var routeHtml = '';
    if (isMove) {
      routeHtml = '<div style="display:flex;align-items:center;gap:6px;background:rgba(15,23,42,0.5);border-radius:10px;padding:8px 12px;margin-bottom:12px;overflow:hidden;">' +
        '<span style="font-size:12px;color:#60a5fa;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">' + first.fromLocation + '</span>' +
        '<span style="color:#475569;font-size:14px;flex-shrink:0;">→</span>' +
        '<span style="font-size:12px;color:#4ade80;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">' + first.toLocation + '</span>' +
        '</div>';
    } else {
      if (isLost) {
        routeHtml = '<div style="background:rgba(239,68,68,0.1);border-radius:10px;padding:8px 12px;margin-bottom:12px;border:1px solid rgba(239,68,68,0.2);">' +
          '<span style="font-size:12px;color:#f87171;font-weight:700;">' + (first.fromLocation || '-') + '</span>' +
          '<span style="color:#ef4444;font-size:14px;margin:0 8px;">→</span>' +
          '<span style="font-size:12px;color:#f87171;font-weight:700;">สูญหาย (ยอดขาด)</span>' +
          '</div>';
      } else {
        routeHtml = '<div style="background:rgba(15,23,42,0.5);border-radius:10px;padding:8px 12px;margin-bottom:12px;">' +
          '<span style="font-size:12px;color:#fbbf24;font-weight:600;">' + (first.fromLocation || first.toLocation || '-') + '</span>' +
          '</div>';
      }
    }
      
    var metaHtml = (first.reporter || first.carrier || first.remark) ?
      '<div style="font-size:11px;color:#64748b;margin-bottom:12px;display:flex;gap:10px;flex-wrap:wrap;">' +
      (first.reporter ? '<span>👤 ' + first.reporter + '</span>' : '') +
      (first.carrier && first.carrier !== first.reporter ? '<span>🚛 ' + first.carrier + '</span>' : '') +
      (first.remark ? '<span>📝 ' + first.remark + '</span>' : '') +
      '</div>' : '';

    var itemsHtml = group.map(function(h) {
      var hasBalance = h.balanceFrom !== null && h.balanceFrom !== undefined;
      var hasBothBalance = hasBalance && h.balanceTo !== null && h.balanceTo !== undefined;
      var balanceHtml = '';
      if (isMove && hasBothBalance) {
        balanceHtml = '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">' +
          '<div style="font-size:10px;background:rgba(15,23,42,0.6);border-radius:6px;padding:2px 8px;color:#94a3b8;"><span style="color:#64748b;">ต้น:</span> <span style="color:#f87171;font-weight:700;">' + h.balanceFrom + '</span></div>' +
          '<div style="font-size:10px;background:rgba(15,23,42,0.6);border-radius:6px;padding:2px 8px;color:#94a3b8;"><span style="color:#64748b;">ปลาย:</span> <span style="color:#4ade80;font-weight:700;">' + h.balanceTo + '</span></div>' +
          '</div>';
      } else if (!isMove && hasBalance) {
        balanceHtml = '<div style="margin-top:6px;"><div style="font-size:10px;background:rgba(15,23,42,0.6);border-radius:6px;padding:2px 8px;color:#94a3b8;display:inline-block;">' +
          '<span style="color:#64748b;">ก่อน:</span> <span style="font-weight:700;">' + h.balanceFrom + '</span>' +
          '<span style="color:#64748b;"> → หลัง:</span> <span style="color:#fbbf24;font-weight:700;">' + h.balanceTo + '</span>' +
          '</div></div>';
      }

      var itemUndoHtml = state.currentUser.role === 'ผู้ใช้งาน' ? '' : '<button onclick="showUndoModal(\'' + h.id + '\')" style="margin-top:6px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:10px;font-family:\'Sarabun\',sans-serif;font-weight:600;display:inline-block;">🔙 ยกเลิก</button>';

      return '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:10px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:14px;font-weight:700;color:#e2e8f0;word-break:break-word;">' + h.itemName + '</div>' +
        balanceHtml +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;">' +
        (() => {
            var isAdj = h.type === 'ปรับยอด';
            var adjDiff = isAdj ? (h.balanceTo - h.balanceFrom) : 0;
            var isLoss = h.type === 'สูญหาย' || h.type === 'นำออก' || h.type === 'ทิ้ง' || (isAdj && adjDiff < 0);
            var isGain = h.type === 'นำเข้า' || (isAdj && adjDiff > 0);
            
            var qtyPrefix = isLoss ? '-' : (isGain ? '+' : '');
            var qtyDisplay = isAdj ? (qtyPrefix + Math.abs(adjDiff)) : (qtyPrefix + h.quantity);
            var qtyColor = isLoss ? '#ef4444' : (isGain ? '#4ade80' : '#e2e8f0');
            if (isAdj && adjDiff === 0) qtyColor = '#94a3b8';
            
            return '<div style="font-size:16px;font-weight:800;color:' + qtyColor + ';font-family:\'Outfit\',sans-serif;">' + qtyDisplay + '</div>';
          })() +
        itemUndoHtml +
        '</div></div></div>';
    }).join('<div style="height:8px;"></div>');

    return '<div class="timeline-item" style="margin-bottom:12px;">' +
      '<div class="timeline-dot" style="background:' + dotColor + '20;color:' + dotColor + ';border:2px solid ' + dotColor + '40;">' + dotEmoji + '</div>' +
      '<div class="glass-card" style="padding:14px;flex:1;min-width:0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">' +
      '<span style="font-size:11px;font-weight:700;color:' + dotColor + ';text-transform:uppercase;letter-spacing:.05em;">' + first.type + '</span>' +
      '<div style="font-size:10px;color:#64748b;">' + dateStr + '</div>' +
      '</div>' +
      routeHtml + metaHtml +
      '<div style="display:flex;flex-direction:column;">' + itemsHtml + '</div>' +
      '</div></div>';
  }).join('');
  if (loadMoreEl) loadMoreEl.style.display = state.history.length < state.historyTotal ? 'block' : 'none';
}

// ====== UNDO MODAL ======
function showUndoModal(id) {
  var h = state.history.find(function(x) { return x.id === id; });
  if (!h) return;
  state.undoTargetId = id;
  document.getElementById('undoInfo').innerHTML =
    '<div><span style="color:#94a3b8;">ประเภท:</span> <strong>' + h.type + '</strong></div>' +
    '<div><span style="color:#94a3b8;">รายการ:</span> <strong>' + h.itemName + '</strong></div>' +
    '<div><span style="color:#94a3b8;">จำนวน:</span> <strong>' + h.quantity + '</strong></div>' +
    (h.type === 'ขนย้าย' ?
      '<div><span style="color:#94a3b8;">เส้นทาง:</span> <strong>' + h.fromLocation + ' → ' + h.toLocation + '</strong></div>' :
      '<div><span style="color:#94a3b8;">สถานที่:</span> <strong>' + h.fromLocation + '</strong></div>') +
    '<div><span style="color:#94a3b8;">บันทึกเมื่อ:</span> ' + (h.date ? formatDate(new Date(h.date)) : '-') + '</div>';
  document.getElementById('undoModal').style.display = 'flex';
}
function closeUndoModal(e) {
  if (e && e.target !== document.getElementById('undoModal')) return;
  document.getElementById('undoModal').style.display = 'none';
}
async function confirmUndo() {
  var btn = document.getElementById('confirmUndoBtn');
  btn.disabled = true; btn.textContent = '⏳ กำลังยกเลิก...';
  try {
    var res = await apiPost('/api/history/undo', { id: state.undoTargetId });
    showToast(res.message, 'success');
    document.getElementById('undoModal').style.display = 'none';
    await loadInventory(); await loadHistory(true);
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = '🔙 ยืนยันการยกเลิก'; }
}

// ====== SETTINGS MODAL ======
async function showSettingsModal() {
  document.getElementById('settingsModal').style.display = 'flex';
  var isUser = state.currentUser.role === 'ผู้ใช้งาน';
  document.querySelectorAll('#settingsModal .section-card').forEach(function(el) {
    if (el.querySelector('.section-title')) {
      el.style.display = isUser ? 'none' : 'block';
    }
  });
  // Also load all locations for the location section
  try {
    var data = await apiGet('/api/locations');
    state.allLocations = data.locations || [];
    renderLocationManageList();
  } catch (err) {
    showToast('โหลดสถานที่ล้มเหลว: ' + err.message, 'error');
    state.allLocations = state.locations.slice();
    renderLocationManageList();
  }
  // Load categories
  try {
    var catData = await apiGet('/api/categories');
    if (catData.categories) {
      state.allCategories = catData.categories;
      renderCategoryManageList();
    }
  } catch (err) {
    renderCategoryManageList();
  }
}

function closeSettingsModal(e) {
  if (e && e.target !== document.getElementById('settingsModal')) return;
  document.getElementById('settingsModal').style.display = 'none';
}

// ---- Category management ----
function renderCategoryManageList() {
  var container = document.getElementById('categoryManageList');
  if (!container) return;
  if (state.allCategories.length === 0) {
    container.innerHTML = '<div style="color:#64748b;font-size:13px;padding:12px;">ยังไม่มีหมวดหมู่</div>';
    return;
  }
  container.innerHTML = state.allCategories.map(function(cat) {
    return '<div class="cat-manage-row">' +
      '<div style="flex:1;font-size:13px;font-weight:600;color:#e2e8f0;">📂 ' + cat + '</div>' +
      '<button onclick="startRenameCat(\'' + esc(cat) + '\')" style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#60a5fa;padding:6px 12px;border-radius:9px;cursor:pointer;font-size:12px;font-family:\'Sarabun\',sans-serif;margin-right:8px;">✏️ เปลี่ยนชื่อ</button>' +
      '<button onclick="startDeleteCat(\'' + esc(cat) + '\')" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:6px 12px;border-radius:9px;cursor:pointer;font-size:12px;font-family:\'Sarabun\',sans-serif;">🗑️ ลบ</button>' +
      '</div>';
  }).join('');
}
function startRenameCat(oldName) {
  var newName = prompt('เปลี่ยนชื่อหมวดหมู่ "' + oldName + '" เป็น:', oldName);
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
  apiPost('/api/categories/rename', { oldName: oldName, newName: newName.trim() })
    .then(function(res) {
      showToast(res.message, 'success');
      return loadInventory();
    })
    .then(function() {
      state.allCategories = state.allCategories.map(function(c) { return c === oldName ? newName.trim() : c; });
      // Update catOrder too
      state.catOrder = state.catOrder.map(function(c) { return c === oldName ? newName.trim() : c; });
      saveCatOrder();
      renderCategoryManageList();
      updateCategoryDatalist();
    })
    .catch(function(err) { showToast(err.message, 'error'); });
}

// ---- Location management ----
function renderLocationManageList() {
  var container = document.getElementById('locationManageList');
  if (!container) return;
  var allLocs = state.allLocations;
  if (allLocs.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#64748b;padding:20px;font-size:13px;">ยังไม่มีสถานที่</div>';
    return;
  }
  container.innerHTML = allLocs.map(function(loc) {
    var isActive = !loc.archived;
    return '<div class="loc-manage-row">' +
      '<span style="font-size:20px;">' + getLocIcon(loc) + '</span>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:13px;font-weight:600;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;">' + loc.name + '</div>' +
      '<div style="font-size:11px;color:#64748b;">' + getLocTypeLabel(loc.type) + '</div>' +
      '</div>' +
      '<button onclick="startRenameLocation(\'' + esc(loc.name) + '\')" style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#60a5fa;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-family:\'Sarabun\',sans-serif;margin-right:8px;">✏️</button>' +
      '<button onclick="startDeleteLocation(\'' + esc(loc.name) + '\')" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-family:\'Sarabun\',sans-serif;margin-right:8px;">🗑️</button>' +
      '<label class="toggle-switch">' +
      '<input type="checkbox" ' + (isActive ? 'checked' : '') + ' onchange="toggleArchiveLocation(\'' + esc(loc.name) + '\', this.checked)" />' +
      '<span class="toggle-slider"></span>' +
      '</label></div>';
  }).join('');
}
async function toggleArchiveLocation(name, active) {
  try {
    await apiPost('/api/locations/archive', { name: name, archived: !active });
    showToast(active ? 'แสดง "' + name + '" แล้ว' : 'ซ่อน "' + name + '" แล้ว', 'success');
    var data = await apiGet('/api/locations');
    state.allLocations = data.locations || [];
    renderLocationManageList();
    await loadInventory();
  } catch (err) { showToast(err.message, 'error'); renderLocationManageList(); }
}
async function confirmAddLocation() {
  var name = document.getElementById('newLocName').value.trim();
  var type = document.getElementById('newLocType').value;
  if (!name) { showToast('กรุณาระบุชื่อสถานที่', 'error'); return; }
  var btn = document.getElementById('addLocBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังเพิ่ม...'; }
  try {
    var res = await apiPost('/api/locations/add', { name: name, type: type });
    showToast(res.message, 'success');
    document.getElementById('newLocName').value = '';
    var data = await apiGet('/api/locations');
    state.allLocations = data.locations || [];
    renderLocationManageList();
    await loadInventory();
  } catch (err) { showToast(err.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '✅ เพิ่มสถานที่'; } }
}

// ====== TOAST ======
function showToast(message, type) {
  type = type || 'info';
  var c = document.getElementById('toastContainer');
  var t = document.createElement('div');
  t.className = 'toast toast-' + type;
  var icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  t.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';
  c.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0'; t.style.transition = 'opacity .3s';
    setTimeout(function() { t.remove(); }, 300);
  }, 3500);
}

// ====== HELPERS ======
function esc(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
function encId(name) {
  return encodeURIComponent(String(name || '')).replace(/%/g, '_').replace(/\./g, '_');
}
function formatDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return '-';
  var pad = function(n) { return String(n).padStart(2, '0'); };
  return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + '/' + (d.getFullYear()+543) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function formatTime(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  var pad = function(n) { return String(n).padStart(2, '0'); };
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' น.';
}

// Legacy alias
function showLocationModal() { showSettingsModal(); }
function closeLocationModal(e) { closeSettingsModal(e); }



function startChangeItemCategory() {
  if (!state.currentItem) return;
  var oldCat = state.currentItem.category || 'ทั่วไป';
  var newCat = prompt('เปลี่ยนหมวดหมู่ของ "' + state.currentItem.name + '" เป็น:', oldCat);
  if (!newCat || newCat.trim() === '' || newCat.trim() === oldCat) return;
  apiPost('/api/inventory/change-item-category', { itemName: state.currentItem.name, newCategory: newCat.trim() })
    .then(function(res) {
      showToast(res.message, 'success');
      document.getElementById('itemDetailModal').style.display = 'none';
      return loadInventory();
    })
    .catch(function(err) {
      alert('Error: ' + err.message);
    });
}

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


// ====== PENDING PAGE ======
async function loadPending() {
  if (!state.currentUser) return;
  var data = await apiGet('/api/pending/list');
  state.pending = data.pending || [];
  
  // Update badge
  var badge1 = document.getElementById('snav-pending-badge');
  var badge2 = document.getElementById('nav-pending-badge');
  if (badge1) {
    badge1.style.display = state.pending.length > 0 ? 'inline-block' : 'none';
    badge1.textContent = state.pending.length;
  }
  if (badge2) {
    badge2.style.display = state.pending.length > 0 ? 'inline-block' : 'none';
    badge2.textContent = state.pending.length;
  }
  
  var countEl = document.getElementById('pendingCount');
  if (countEl) countEl.textContent = state.pending.length + ' รายการ';
  
  renderPendingList();
}

function renderPendingList() {
  var c = document.getElementById('pendingList');
  if (!c) return;
  if (state.pending.length === 0) {
    c.innerHTML = '<div class="empty-state">ไม่มีรายการรอรับ</div>';
    return;
  }
  
  c.innerHTML = state.pending.map(function(p) {
    var d = new Date(p.date);
    var dateStr = (d.getDate().toString().padStart(2, '0')) + '/' + ((d.getMonth() + 1).toString().padStart(2, '0')) + '/' + (d.getFullYear() + 543) + ' ' + (d.getHours().toString().padStart(2, '0')) + ':' + (d.getMinutes().toString().padStart(2, '0'));
    
    var cancelBtnHtml = '';
    if (state.currentUser.role === 'ผู้ดูแลสโตร์' || state.currentUser.role === 'แอดมิน') {
      cancelBtnHtml = '<button onclick="cancelPendingMove(\'' + p.id + '\', event)" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#f87171; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:11px; font-family:\'Sarabun\',sans-serif; line-height:1; flex-shrink:0;">❌ ยกเลิก</button>';
    }

    var hasReceiver = p.items.every(function(it) {
      return it.receiver !== undefined && it.receiver !== null && it.receiver.trim() !== '';
    });
    var hasMismatch = false;
    if (hasReceiver) {
      hasMismatch = p.items.some(function(it) {
        return Number(it.quantitySent) !== Number(it.quantityReceived);
      });
    }

    var dotStyle = '';
    var cardStyle = '';
    var warningHtml = '';
    var isMove = p.from_location !== 'ปรับยอด' && p.type !== 'adjust';
    var dotEmoji = isMove ? '🚛' : '📥';
    
    if (hasReceiver && hasMismatch) {
      dotStyle = 'background:rgba(239, 68, 68, 0.15); color:#f87171; border:2px solid rgba(239, 68, 68, 0.3);';
      cardStyle = 'border-left:4px solid #ef4444;';
      warningHtml = '<div style="font-size:11px; color:#f87171; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:4px;">⚠️ ยอดรับไม่ตรงกัน! รอสโตร์ตรวจสอบ (ผู้รับ: ' + (p.items[0].receiver || '-') + ')</div>';
    } else {
      if (isMove) {
        dotStyle = 'background:rgba(59, 130, 246, 0.15); color:#3b82f6; border:2px solid rgba(59, 130, 246, 0.3);';
        cardStyle = 'border-left:4px solid #3b82f6;';
      } else {
        dotStyle = 'background:rgba(251, 191, 36, 0.15); color:#fbbf24; border:2px solid rgba(251, 191, 36, 0.3);';
        cardStyle = 'border-left:4px solid #fbbf24;';
      }
    }

      var titleText = p.from_location + ' ➔ ' + p.to_location;
      var itemsText = p.items.length + ' รายการ';
      
      if (p.from_location === 'ปรับยอด' && p.items && p.items.length > 0) {
        var it = p.items[0];
        var itemName = it.itemName || it.name || 'ไม่ทราบชื่อ';
        var oldQ = it.currentQty !== undefined ? Number(it.currentQty) : '?';
        var newQ = it.quantitySent !== undefined ? Number(it.quantitySent) : '?';
        var diffStr = '';
        if (oldQ !== '?' && newQ !== '?') {
          var diff = newQ - oldQ;
          var sign = diff > 0 ? '+' : '';
          diffStr = ' [' + sign + diff + ']';
        }
        itemsText = itemName + ' (ปรับ: ' + oldQ + ' ➔ ' + newQ + diffStr + ')';
      }
      
      return '<div class="timeline-item" style="margin-bottom:12px;">' +
        '<div class="timeline-dot" style="' + dotStyle + ' font-size:16px;">' + dotEmoji + '</div>' +
        '<div class="glass-card" style="' + cardStyle + ' padding:14px; flex:1; min-width:0; cursor:pointer;" onclick="openReceiveModal(\'' + p.id + '\')">' +
          '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">' + dateStr + '</div>' +
          warningHtml +
          '<div style="font-size:14px;color:#e2e8f0;font-weight:700;margin-bottom:6px;">' + titleText + '</div>' +
          '<div style="font-size:13px;color:#cbd5e1;display:flex;justify-content:space-between;align-items:center;">' +
            '<span>' + itemsText + '</span>' +
          cancelBtnHtml +
        '</div>' +
        (p.remark ? '<div style="font-size:12px;color:#fbbf24;margin-top:6px;word-break:break-all;">' + p.remark + '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

let currentReceiveMove = null;

function openReceiveModal(id) {
  notifyParentModalState(true);
  var p = state.pending.find(function(x) { return x.id === id; });
  if (!p) return;
  currentReceiveMove = JSON.parse(JSON.stringify(p));
  
  var meta = document.getElementById('receiveMeta');
  var list = document.getElementById('receiveItemsList');
  var confirmBtn = document.getElementById('confirmReceiveBtn');
  var forceBtn = document.getElementById('forceCompleteBtn');
  var adjustConfirmBtn = document.getElementById('confirmAdjustReceiveBtn');
  var detailsGrid = document.getElementById('receiveDetailsGrid');

  if (p.from_location === 'ปรับยอด') {
    meta.innerHTML = 'ประเภท: <b>ขอปรับยอด</b><br>สถานที่: ' + p.to_location + '<br>ผู้ขอปรับ: ' + (p.reporter || '-') + '<br>หมายเหตุ: ' + (p.remark || '-');
    list.innerHTML = p.items.map(function(item) {
      var oldQty = item.currentQty || 0;
      var newQty = item.quantitySent || 0;
      var diff = newQty - oldQty;
      var diffStr = diff > 0 ? ('+' + diff) : (diff < 0 ? diff : '0');
      var diffColor = diff > 0 ? '#4ade80' : (diff < 0 ? '#f87171' : '#94a3b8');

      return '<div style="background:rgba(30,41,59,0.5); padding:14px; border-radius:8px; text-align:center;">' +
        '<div style="font-weight:700; color:#e2e8f0; margin-bottom:10px; font-size:16px;">' + item.itemName + '</div>' +
        '<div style="display:flex; justify-content:center; align-items:center; gap:20px;">' +
          '<div style="text-align:right;">' +
            '<div style="font-size:12px; color:#94a3b8;">ยอดเดิม</div>' +
            '<div style="font-size:18px; color:#cbd5e1; font-weight:700;">' + oldQty + '</div>' +
          '</div>' +
          '<div style="color:#64748b;">➔</div>' +
          '<div style="text-align:left;">' +
            '<div style="font-size:12px; color:#38bdf8;">ยอดใหม่</div>' +
            '<div style="font-size:24px; color:#38bdf8; font-weight:800;">' + newQty + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:13px; margin-top:12px; font-weight:600; color:' + diffColor + ';">ส่วนต่าง: ' + diffStr + '</div>' +
        '</div>';
    }).join('');
    
    if (detailsGrid) detailsGrid.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (forceBtn) forceBtn.style.display = 'none';
    if (adjustConfirmBtn) {
      adjustConfirmBtn.style.display = (state.currentUser.role === 'ผู้ดูแลสโตร์' || state.currentUser.role === 'แอดมิน') ? 'block' : 'none';
    }
  } else {
    meta.innerHTML = 'ต้นทาง: ' + p.from_location + '<br>ปลายทาง: ' + p.to_location + '<br>หมายเหตุ: ' + (p.remark || '-');
    var canEdit = (state.currentUser.role !== 'ผู้ดูแลสโตร์');
    var isStoreOrAdmin = (state.currentUser.role === 'ผู้ดูแลสโตร์' || state.currentUser.role === 'แอดมิน');
    
    list.innerHTML = p.items.map(function(item, idx) {
      var sentQtyHtml = isStoreOrAdmin ? 
        'ยอดส่ง: <input type="number" id="sentQty_' + idx + '" class="form-input" style="width:75px; padding:4px; text-align:center; display:inline-block;" value="' + item.quantitySent + '" min="0">' : 
        'ยอดส่ง: <span style="font-weight:700; color:#38bdf8;">' + item.quantitySent + '</span>';
      
      var hasBeenReported = item.receiver !== undefined && item.receiver !== null && item.receiver.trim() !== '';
      var rcvValue = hasBeenReported ? item.quantityReceived : '';

      return '<div style="background:rgba(30,41,59,0.5); padding:10px; border-radius:8px;">' +
        '<div style="font-weight:700; color:#e2e8f0; margin-bottom:6px;">' + item.itemName + '</div>' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<div style="font-size:12px; color:#cbd5e1; display:flex; align-items:center; gap:4px;">' + sentQtyHtml + '</div>' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="font-size:12px; color:#cbd5e1;">ยอดรับ:</span>' +
            '<input type="number" id="rcvQty_' + idx + '" class="form-input" style="width:75px; padding:6px; text-align:center; font-size:16px !important;" value="' + rcvValue + '" ' + (canEdit ? '' : 'disabled') + ' min="0" placeholder="ระบุ...">' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    
    if (detailsGrid) detailsGrid.style.display = 'grid'; // .receive-details-grid uses grid
    
    var hasReported = p.items.every(function(it) {
      return it.quantityReceived !== undefined && it.quantityReceived !== null && it.receiver && it.receiver.trim() !== '';
    });
    
    if (forceBtn) {
      forceBtn.style.display = (isStoreOrAdmin && hasReported) ? 'block' : 'none';
      forceBtn.innerHTML = '🚨 บังคับจบงาน (สูญหาย)';
    }
    if (confirmBtn) {
      confirmBtn.style.display = 'block';
      confirmBtn.innerHTML = isStoreOrAdmin ? '🔄 ยืนยันการส่งใหม่' : '✅ ยืนยันการรับของ';
    }
    if (adjustConfirmBtn) adjustConfirmBtn.style.display = 'none';

    // Initialize date and receiver inputs
    var savedReceiver = p.items[0] && p.items[0].receiver;
    var savedDate = p.items[0] && p.items[0].receiveDate;
    var dateInput = document.getElementById('receiveDate');
    if (dateInput) {
      if (savedDate) dateInput.value = savedDate;
      else {
        var today = new Date();
        dateInput.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      }
    }
    var receiverInput = document.getElementById('receiveReceiver');
    if (receiverInput) {
      if (savedReceiver) receiverInput.value = savedReceiver;
      else receiverInput.value = '';
    }
  }

  document.body.classList.add('modal-open'); 
  if (window.triggerModalLayoutUpdate) window.triggerModalLayoutUpdate();
  document.getElementById('receiveModal').style.display = 'flex';
}

function closeReceiveModal(e) {
  notifyParentModalState(false);
  if (e && e.target !== document.getElementById('receiveModal')) return;
  document.body.classList.remove('modal-open');
  document.getElementById('receiveModal').style.display = 'none';
  currentReceiveMove = null;
  window.scrollTo(0, 0); if (window.parent && window.parent !== window) { try { window.parent.scrollTo(0, 0); } catch(e){} }
}

async function cancelPendingMove(id, event) {
  if (event) event.stopPropagation(); // Prevent opening receive modal
  
  if (!confirm('ยืนยันยกเลิกรายการรอรับนี้? ยอดวัสดุทั้งหมดจะถูกโอนกลับเข้าต้นทาง')) return;
  
  try {
    var res = await apiPost('/api/pending/cancel', { id: id });
    showToast(res.message, 'success');
    loadPending();
    loadInventory();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function confirmReceive() {
  if (!currentReceiveMove) return;
  
  var isStoreOrAdmin = (state.currentUser.role === 'ผู้ดูแลสโตร์' || state.currentUser.role === 'แอดมิน');
  var rcvDate = document.getElementById('receiveDate').value;
  var rcvReceiver = document.getElementById('receiveReceiver').value.trim();

  // Check if any receive quantity is entered
  var anyReceiveEntered = false;
  for (var i = 0; i < currentReceiveMove.items.length; i++) {
    var inp = document.getElementById('rcvQty_' + i);
    if (inp && inp.value.trim() !== '') {
      anyReceiveEntered = true;
      break;
    }
  }

  // Receiver name and date are required ONLY IF regular user OR if receive quantities are entered
  if (!isStoreOrAdmin || anyReceiveEntered) {
    if (!rcvReceiver) {
      showToast('กรุณาระบุชื่อผู้รับของ', 'error');
      return;
    }
    if (!rcvDate) {
      showToast('กรุณาระบุวันที่รับของ', 'error');
      return;
    }
  }

  // Read inputs
  var updatedItems = [];
  var allMatch = true;
  for (var i = 0; i < currentReceiveMove.items.length; i++) {
    var oldItem = currentReceiveMove.items[i];
    var inp = document.getElementById('rcvQty_' + i);
    
    var rcvVal = inp.value.trim();
    if (rcvVal === '' && state.currentUser.role === 'ผู้ใช้งาน') {
      showToast('กรุณาระบุยอดรับของให้ครบทุกรายการ', 'error');
      return;
    }
    
    var qRcv = rcvVal === '' ? null : Number(rcvVal);
    if (rcvVal !== '' && (isNaN(qRcv) || qRcv < 0)) {
      showToast('กรุณาระบุยอดรับของให้ถูกต้อง', 'error');
      return;
    }
    
    var sentInp = document.getElementById('sentQty_' + i);
    var qSent = sentInp ? Number(sentInp.value) : Number(oldItem.quantitySent);
    if (isNaN(qSent)) qSent = Number(oldItem.quantitySent);
    
    var newItem = {
      itemName: oldItem.itemName,
      quantitySent: qSent
    };
    if (rcvReceiver) newItem.receiver = rcvReceiver;
    if (rcvDate) newItem.receiveDate = rcvDate;
    if (qRcv !== null) newItem.quantityReceived = qRcv;

    if (!newItem.receiver && oldItem.receiver) newItem.receiver = oldItem.receiver;
    if (!newItem.receiveDate && oldItem.receiveDate) newItem.receiveDate = oldItem.receiveDate;
    if (newItem.quantityReceived === undefined && oldItem.quantityReceived !== undefined) {
      newItem.quantityReceived = oldItem.quantityReceived;
    }
    
    updatedItems.push(newItem);
    
    if (qRcv === null || qRcv !== qSent) {
      allMatch = false;
    }
  }
  
  currentReceiveMove.items = updatedItems;
  currentReceiveMove.receiveDate = rcvDate;
  currentReceiveMove.receiver = rcvReceiver;
  
  if (allMatch) {
    if (confirm('ยอดรับตรงกับยอดส่งทั้งหมด ยืนยันการจบงาน?')) {
      try {
        var res = await apiPost('/api/pending/complete', { move: currentReceiveMove });
        showToast(res.message, 'success');
        closeReceiveModal();
        broadcastNotification('receive', '📥 รับของเรียบร้อย', `${currentReceiveMove.to_location} รับของจาก ${currentReceiveMove.from_location} ครบถ้วน`, 'history');
        loadPending();
        loadInventory();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
    }
  } else {
    // Just save state
    try {
      var res = await apiPost('/api/pending/receive', { id: currentReceiveMove.id, items: updatedItems });
      showToast('บันทึกยอดรับแล้ว (ยอดยังไม่ตรงกัน โปรดให้สโตร์ตรวจสอบ)', 'success');
      closeReceiveModal();
      broadcastNotification('mismatch', '⚠️ แจ้งเตือนด่วน', `${currentReceiveMove.to_location} รับของจาก ${currentReceiveMove.from_location} ไม่ครบ รอการตรวจสอบ`, 'pending');
      loadPending();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
}

async function forceCompleteReceive() {
  if (state.currentUser && state.currentUser.role === 'ผู้ใช้งาน') {
    showToast('ผู้ใช้งานทั่วไปไม่สามารถบังคับจบงานได้', 'error');
    return;
  }
  if (!currentReceiveMove) return;

  // Enforce validation that recipient must have reported first
  var hasReceiver = currentReceiveMove.items.every(function(it) {
    return it.receiver !== undefined && it.receiver !== null && it.receiver.trim() !== '';
  });
  if (!hasReceiver) {
    showToast('ไม่สามารถบังคับจบงานได้ เนื่องจากผู้รับของยังไม่ได้แจ้งยอดรับ', 'error');
    return;
  }

  if (!confirm('ยืนยันบังคับจบงาน? ยอดที่ขาดจะถูกบันทึกไปที่ "สูญหาย"')) return;
  
  var rcvDate = document.getElementById('receiveDate').value;
  var rcvReceiver = document.getElementById('receiveReceiver').value;
  if (!rcvReceiver.trim()) {
    showToast('กรุณาระบุชื่อผู้รับของ', 'error');
    return;
  }
  if (!rcvDate) {
    showToast('กรุณาระบุวันที่รับของ', 'error');
    return;
  }

  var updatedItems = [];
  for (var i = 0; i < currentReceiveMove.items.length; i++) {
    var oldItem = currentReceiveMove.items[i];
    var inp = document.getElementById('rcvQty_' + i);
    var qRcv = Number(inp.value);
    if (isNaN(qRcv)) qRcv = 0;
    
    var sentInp = document.getElementById('sentQty_' + i);
    var qSent = sentInp ? Number(sentInp.value) : Number(oldItem.quantitySent);
    if (isNaN(qSent)) qSent = Number(oldItem.quantitySent);
    
    updatedItems.push({
      itemName: oldItem.itemName,
      quantitySent: qSent,
      quantityReceived: qRcv,
      receiver: rcvReceiver,
      receiveDate: rcvDate
    });
  }
  currentReceiveMove.items = updatedItems;
  currentReceiveMove.receiveDate = rcvDate;
  currentReceiveMove.receiver = rcvReceiver;
  
  try {
    var res = await apiPost('/api/pending/force-complete', { move: currentReceiveMove });
    showToast(res.message, 'success');
    closeReceiveModal();
    broadcastNotification('lost', '❌ บันทึกของสูญหาย', `เคลียร์รายการขนย้าย ${currentReceiveMove.from_location} ➔ ${currentReceiveMove.to_location} เรียบร้อยแล้ว`, 'history');
    loadPending();
    loadInventory();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}


/* ===== SWIPE DOWN TO CLOSE MODAL SHEET ===== */
(function initSwipeToClose() {
  var startY = 0;
  var currentDeltaY = 0;
  var isDragging = false;
  var activeSheet = null;
  var activeOverlay = null;

  document.addEventListener('touchstart', function(e) {
    var handle = e.target.closest('.modal-handle');
    var sheet = e.target.closest('.modal-sheet');
    var overlay = e.target.closest('.modal-overlay');

    if (!sheet || !overlay) return;

    // Allow swipe down if handle touched OR if sheet is scrolled at top
    if (handle || sheet.scrollTop <= 0) {
      startY = e.touches[0].clientY;
      currentDeltaY = 0;
      activeSheet = sheet;
      activeOverlay = overlay;
      isDragging = false;
    }
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!activeSheet || !activeOverlay) return;

    var currentY = e.touches[0].clientY;
    var deltaY = currentY - startY;

    // Only drag down if moving downwards and at top of scroll
    if (deltaY > 0 && activeSheet.scrollTop <= 0) {
      if (!isDragging && deltaY > 4) {
        isDragging = true;
      }
      if (isDragging) {
        currentDeltaY = deltaY;
        activeSheet.style.transition = 'none';
        activeSheet.style.transform = 'translateY(' + deltaY + 'px)';
        if (e.cancelable) e.preventDefault();
      }
    } else {
      if (isDragging) {
        activeSheet.style.transform = '';
        isDragging = false;
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', function(e) {
    if (!activeSheet || !activeOverlay) return;

    var sheet = activeSheet;
    var overlay = activeOverlay;
    var deltaY = currentDeltaY;

    activeSheet = null;
    activeOverlay = null;

    if (isDragging) {
      sheet.style.transition = 'transform 0.2s ease-out';
      if (deltaY > 80) {
        // Swipe down threshold reached -> close modal
        sheet.style.transform = 'translateY(100%)';
        setTimeout(function() {
          sheet.style.transform = '';
          sheet.style.transition = '';
          overlay.style.display = 'none';
          document.body.classList.remove('modal-open');
          if (typeof currentReceiveMove !== 'undefined') currentReceiveMove = null;
          window.scrollTo(0, 0); if (window.parent && window.parent !== window) { try { window.parent.scrollTo(0, 0); } catch(e){} }
        }, 180);
      } else {
        // Snap back up
        sheet.style.transform = 'translateY(0)';
        setTimeout(function() {
          sheet.style.transform = '';
          sheet.style.transition = '';
        }, 220);
      }
    }
  });
})();





/* ===== NOTIFY PARENT WINDOW ON MODAL OPEN / CLOSE ===== */
function notifyParentModalState(isOpen) {
  if (isOpen) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'MODAL_STATE', open: isOpen }, '*');
    } catch(e){}
  }
}

  function updateHistoryDatalists() {
    var locDl = document.getElementById('histLocList');
    var itemDl = document.getElementById('histItemList');
    if (locDl && state.locations) {
      locDl.innerHTML = state.locations.map(function(l) { return '<option value="' + esc(l.name) + '"></option>'; }).join('');
    }
    if (itemDl && state.items) {
      itemDl.innerHTML = state.items.map(function(i) { return '<option value="' + esc(i.name) + '"></option>'; }).join('');
    }
  }


async function confirmAdjustReceive() {
  if (state.currentUser.role === 'ผู้ใช้งาน') {
    showToast('ผู้ใช้งานทั่วไปไม่สามารถอนุมัติได้', 'error');
    return;
  }
  if (!currentReceiveMove) return;
  
  if (!confirm('ยืนยันอนุมัติการปรับยอดนี้?')) return;
  
  // Set default values for date and receiver since they are hidden
  var today = new Date();
  var rcvDate = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  var rcvReceiver = state.currentUser.name || state.currentUser.username || 'สโตร์';

  currentReceiveMove.items.forEach(function(it) {
    it.receiveDate = rcvDate;
    it.receiver = rcvReceiver;
    // ensure quantityReceived is same as quantitySent
    it.quantityReceived = it.quantitySent;
  });

  try {
    var res = await apiPost('/api/pending/force-complete', { move: currentReceiveMove });
    showToast(res.message, 'success');
    closeReceiveModal();
    broadcastNotification('lost', '❌ บันทึกของสูญหาย', `เคลียร์รายการขนย้าย ${currentReceiveMove.from_location} ➔ ${currentReceiveMove.to_location} เรียบร้อยแล้ว`, 'history');
    await loadPending();
  } catch (err) {
    showToast(err.message, 'error');
  }
}


/* Fix Mobile Keyboard Push-up */
document.addEventListener('focusout', function(e) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    setTimeout(function() {
      const active = document.activeElement;
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
      window.scrollTo(0, 0);
      if (window.parent) window.parent.scrollTo(0, 0);
    }, 150);
  }
});


// ==================== EXPORT SYSTEM ====================

function escapeHtmlStr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel Library is loading... please try again.', 'error');
    return;
  }
  var data = [];
  var d = new Date();
  var dateStr = d.getDate() + '/' + (d.getMonth()+1) + '/' + (d.getFullYear()+543);
  var validLocs = state.locations.filter(function(l) { return l.name !== 'ปรับยอด'; });
  
  state.items.forEach(function(it, index) {
    var row = {
      'ลำดับ': index + 1,
      'วันที่เอกสาร': dateStr,
      'หมวดหมู่': it.category || '-',
      'ชื่อวัสดุ': it.name,
      'ยอดรวมทั้งหมด': (it.quantity || 0)
    };
    validLocs.forEach(function(loc) {
      row[loc.name] = (it.quantities && it.quantities[loc.name]) ? it.quantities[loc.name] : 0;
    });
    data.push(row);
  });
  
  var ws = XLSX.utils.json_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  
  var safeDateStr = dateStr.replace(/\//g, '-');
  XLSX.writeFile(wb, "รายงานสต็อก_" + safeDateStr + ".xlsx");
  showToast('ดาวน์โหลด Excel สำเร็จ', 'success');
}

function generateReportTableHtml() {
  var d = new Date();
  var dateStr = d.getDate() + '/' + (d.getMonth()+1) + '/' + (d.getFullYear()+543);
  var html = '<div id="pdfExportWrap" style="padding:20px; font-family:\'Sarabun\',sans-serif; width:100%; background:white; color:black;">';
  html += '<h2 style="text-align:center; margin-bottom:10px; font-size:18px;">รายงานสต็อกวัสดุ-อุปกรณ์</h2>';
  html += '<div style="text-align:right; margin-bottom:10px; font-size:12px;">วันที่ออกรายงาน: ' + dateStr + '</div>';
  html += '<table style="width:100%; border-collapse:collapse; font-size:10px;" border="1">';
  html += '<thead style="background:#f1f5f9;"><tr>';
  html += '<th style="padding:4px;border:1px solid #cbd5e1;">ลำดับ</th>';
  html += '<th style="padding:4px;border:1px solid #cbd5e1;">หมวดหมู่</th>';
  html += '<th style="padding:4px;border:1px solid #cbd5e1;">ชื่อวัสดุ</th>';
  html += '<th style="padding:4px;border:1px solid #cbd5e1;">รวม</th>';
  
  var validLocs = state.locations.filter(function(l) { return l.name !== 'ปรับยอด'; });
  validLocs.forEach(function(l) {
    html += '<th style="padding:4px;border:1px solid #cbd5e1;white-space:nowrap;writing-mode:horizontal-tb;">' + escapeHtmlStr(l.name) + '</th>';
  });
  html += '</tr></thead><tbody>';
  
  state.items.forEach(function(it, index) {
    html += '<tr>';
    html += '<td style="padding:4px;border:1px solid #cbd5e1;text-align:center;">' + (index+1) + '</td>';
    html += '<td style="padding:4px;border:1px solid #cbd5e1;">' + escapeHtmlStr(it.category || '-') + '</td>';
    html += '<td style="padding:4px;border:1px solid #cbd5e1;">' + escapeHtmlStr(it.name) + '</td>';
    html += '<td style="padding:4px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">' + (it.quantity || 0) + '</td>';
    validLocs.forEach(function(l) {
      var qty = (it.quantities && it.quantities[l.name]) ? it.quantities[l.name] : 0;
      html += '<td style="padding:4px;border:1px solid #cbd5e1;text-align:center;">' + qty + '</td>';
    });
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  return html;
}

function exportToPDF() {
  if (typeof window.html2pdf === 'undefined') {
    showToast('PDF Library is loading... please try again.', 'error');
    return;
  }
  var html = generateReportTableHtml();
  var container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '297mm'; // A4 landscape width
  document.body.appendChild(container);
  
  var d = new Date();
  var dateStr = d.getDate() + '-' + (d.getMonth()+1) + '-' + (d.getFullYear()+543);
  
  var opt = {
    margin:       [10, 10, 10, 10], // mm
    filename:     'รายงานสต็อก_' + dateStr + '.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };
  
  showToast('กำลังเตรียมไฟล์ PDF กรุณารอสักครู่...', 'info');
  
  html2pdf().set(opt).from(container.firstChild).save().then(function() {
    document.body.removeChild(container);
    showToast('ดาวน์โหลด PDF สำเร็จ', 'success');
  }).catch(function(err) {
    document.body.removeChild(container);
    showToast('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
  });
}
// ==================== DELETE FUNCTIONS ====================
async function deleteCurrentItem() {
  if (!state.currentItem) return;
  if (!confirm('ยืนยันการลบวัสดุ "' + state.currentItem.name + '" อย่างถาวร?')) return;
  try {
    var res = await apiPost('/api/inventory/delete-item', { itemName: state.currentItem.name });
    showToast(res.message, 'success');
    closeItemDetailModal();
    await loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function startDeleteCat(catName) {
  if (!confirm('ยืนยันการลบหมวดหมู่ "' + catName + '"?\n(วัสดุในหมวดนี้จะไม่ถูกลบ แต่จะกลายเป็น "ไม่มีหมวดหมู่")')) return;
  try {
    var res = await apiPost('/api/categories/delete', { name: catName });
    showToast(res.message, 'success');
    state.allCategories = state.allCategories.filter(c => c !== catName);
    state.catOrder = state.catOrder.filter(c => c !== catName);
    saveCatOrder();
    renderCategoryManageList();
    updateCategoryDatalist();
    await loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function startDeleteLocation(locName) {
  if (!confirm('ยืนยันการลบสถานที่ "' + locName + '" ถาวร?\n⚠️ ยอดคงเหลือของวัสดุที่อยู่ในสถานที่นี้จะหายไปจากตารางทันที')) return;
  try {
    var res = await apiPost('/api/locations/delete', { name: locName });
    showToast(res.message, 'success');
    var data = await apiGet('/api/locations');
    state.allLocations = data.locations || [];
    renderLocationManageList();
    await loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Modal Back Handler for Full Screen Mobile Modals
window.handleModalBack = function(btn) {
  var overlay = btn.closest('.modal-overlay');
  if (!overlay) return;
  if (overlay.id === 'receiveModal') closeReceiveModal();
  else if (overlay.id === 'moveModal') closeMoveModalDirect();
  else if (overlay.id === 'addItemModal') document.getElementById('addItemModal').style.display = 'none';
  else if (overlay.id === 'adjustModal') document.getElementById('adjustModal').style.display = 'none';
  else if (overlay.id === 'settingsModal') closeSettingsModal();
  else if (overlay.id === 'undoModal') document.getElementById('undoModal').style.display = 'none';
  else if (overlay.id === 'itemDetailModal') closeItemDetailModal();
  else overlay.style.display = 'none';
};



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
        .replace(/\-/g, '+')
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
      
      return `
        <div onclick="clickNotification('${n.id}', '${n.link_url || ''}', ${isRead})" style="padding:14px 20px; border-bottom:1px solid var(--border); cursor:pointer; background:${isRead ? 'transparent' : 'rgba(59,130,246,0.1)'}; display:flex; gap:12px; align-items:flex-start; transition:background .2s;">
          <div style="font-size:24px; line-height:1; flex-shrink:0;">${getNotiEmoji(n.type)}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:14px; font-weight:700; color:${isRead ? 'var(--text)' : '#60a5fa'}; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${n.title}</div>
            <div style="font-size:13px; color:var(--muted); line-height:1.4;">${n.message}</div>
            <div style="font-size:11px; color:#475569; margin-top:6px;">${dateStr}</div>
          </div>
          ${!isRead ? '<div style="width:8px; height:8px; background:#3b82f6; border-radius:50%; flex-shrink:0; margin-top:8px;"></div>' : ''}
        </div>
      `;
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
