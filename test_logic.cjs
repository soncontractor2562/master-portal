const fs = require('fs');
const appJs = fs.readFileSync('public/apps/store-dragdrop/app.js', 'utf8');

global.localStorage = {
  data: {},
  getItem: function(k) { return this.data[k] || null; },
  setItem: function(k, v) { this.data[k] = String(v); }
};

const mockEngineOnly = appJs.split('// ====== API MOCK INTERCEPTOR ======')[0];

const vm = require('vm');
const context = { 
  window: { localStorage: global.localStorage }, 
  document: { 
    addEventListener: () => {},
    getElementById: () => ({ style: {}, classList: { remove: () => {}, add: () => {} }, querySelectorAll: () => [] }),
    querySelectorAll: () => []
  },
  console: console 
};
vm.createContext(context);
vm.runInContext(mockEngineOnly, context);

vm.runInContext(`
  // Run mock requests by capturing the returned functions or just manually eval
  var local = getInitialLocalData();
  var item = local.items[0];
  console.log('Test item:', item.name);
  var startQtyFrom = item.quantities['สโตร์รัตนา'] || 0;
  var startQtyTo = item.quantities['เอกมัย'] || 0;
  
  mockEngineHandler('/api/inventory/move', 'POST', {
    itemName: item.name,
    quantity: 5,
    fromLocation: 'สโตร์รัตนา',
    toLocation: 'เอกมัย'
  });
  
  local = JSON.parse(window.localStorage.getItem('store_app_local_data_v18'));
  console.log('After move:');
  var movedItem = local.items.find(i => i.name === item.name);
  console.log('From:', movedItem.quantities['สโตร์รัตนา'], 'To:', movedItem.quantities['เอกมัย']);
  
  var res = apiPost('/api/history/undo', {}).then(r => console.log('UNDO RESULT:', r));

  
  local = JSON.parse(window.localStorage.getItem('store_app_local_data_v18'));
  console.log('After undo:');
  var undoneItem = local.items.find(i => i.name === item.name);
  console.log('From:', undoneItem.quantities['สโตร์รัตนา'], 'To:', undoneItem.quantities['เอกมัย']);
`, context);
