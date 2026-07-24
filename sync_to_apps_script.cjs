const fs = require('fs');

const appsScriptApiPost = `async function apiPost(pathStr, body) {
  return new Promise(function(resolve, reject) {
    var action;
    if (pathStr === '/api/inventory/get') action = 'getInventoryData';
    else if (pathStr === '/api/inventory/move') action = 'moveInventory';
    else if (pathStr === '/api/inventory/move-bulk') action = 'moveInventoryBulk';
    else if (pathStr === '/api/inventory/adjust') action = 'adjustInventory';
    else if (pathStr === '/api/inventory/add-item') action = 'addItem';
    else if (pathStr === '/api/inventory/history') action = 'getHistory';
    else if (pathStr === '/api/inventory/undo') action = 'undoHistory';
    else if (pathStr === '/api/inventory/settings/get') action = 'getSettings';
    else if (pathStr === '/api/inventory/settings/save') action = 'saveSettings';
    else if (pathStr === '/api/inventory/verify-pin') action = 'verifyPin';
    else if (pathStr === '/api/inventory/locations/get') action = 'getLocations';
    else if (pathStr === '/api/inventory/locations/add') action = 'addLocation';
    else if (pathStr === '/api/inventory/locations/archive') action = 'archiveLocation';
    else if (pathStr === '/api/inventory/locations/hide-count') action = 'toggleHideCount';
    else if (pathStr === '/api/inventory/categories/get') action = 'getCategories';
    else if (pathStr === '/api/inventory/rename-category') action = 'renameCategory';
    else if (pathStr === '/api/inventory/rename-item') action = 'renameItem';
    else {
      reject(new Error("Unknown route: " + pathStr));
      return;
    }
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.success) resolve(res);
        else reject(new Error(res ? res.error : "Unknown error"));
      })
      .withFailureHandler(function(err) {
        reject(err);
      })
      [action](body);
  });
}`;

function buildJavaScriptHtml() {
  const appJsPath = 'C:/Users/HP/Desktop/Antigravity/Master Portal/public/apps/store-dragdrop/app.js';
  let appJs = fs.readFileSync(appJsPath, 'utf8');
  
  const apiStart = 'async function apiPost(pathStr, body) {';
  const nextFunc = 'async function refreshAll() {';
  
  const idxStart = appJs.indexOf(apiStart);
  const idxEnd = appJs.indexOf(nextFunc);
  
  if (idxStart !== -1 && idxEnd !== -1) {
    let before = appJs.substring(0, idxStart);
    let after = appJs.substring(idxEnd);
    let result = '<script>\n' + before + appsScriptApiPost + '\n\n' + after + '\n</script>';
    
    fs.writeFileSync('C:/Users/HP/Desktop/Antigravity/Store Drag&Drop/Store manager V1/JavaScript.html', result);
    console.log('Successfully recreated JavaScript.html');
  } else {
    console.log('Could not find boundaries');
  }
}

buildJavaScriptHtml();
