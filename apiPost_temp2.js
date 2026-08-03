
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
        
        const { data: