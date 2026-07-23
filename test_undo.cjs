const fs = require('fs');
const appJs = fs.readFileSync('public/apps/store-dragdrop/app.js', 'utf8');

global.localStorage = {
  data: {},
  getItem: function(k) { return this.data[k] || null; },
  setItem: function(k, v) { this.data[k] = String(v); }
};

const vm = require('vm');
const context = { 
  window: { localStorage: global.localStorage }, 
  document: { addEventListener: () => {} },
  console: console 
};
vm.createContext(context);
try {
  const mockEngineOnly = appJs.split('// ====== API MOCK INTERCEPTOR ======')[0];
  vm.runInContext(mockEngineOnly, context);
  
  vm.runInContext(`
    var local = getInitialLocalData();
    window.localStorage.setItem('store_app_local_data_v18', JSON.stringify(local));
    
    var h = local.history[0];
    console.log('BEFORE Undo:');
    var i = local.items.find(x => x.name === h.itemName);
    console.log(h.type, h.itemName, 'from', h.fromLocation, 'to', h.toLocation, 'qty', h.quantity);
    console.log('From QTY:', i.quantities[h.fromLocation], 'To QTY:', i.quantities[h.toLocation]);
    
    var res = mockEngineHandler('/api/history/undo', 'POST', {});
    console.log(res);
    
    var local2 = JSON.parse(window.localStorage.getItem('store_app_local_data_v18'));
    var i2 = local2.items.find(x => x.name === h.itemName);
    console.log('AFTER Undo:');
    console.log('From QTY:', i2.quantities[h.fromLocation], 'To QTY:', i2.quantities[h.toLocation]);
  `, context);
} catch(e) { console.error(e); }
