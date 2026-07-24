const fs = require('fs');

function patchAppJs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add data-item-name and drag-handle
  const rowStartSearch = `'transition:background .15s;-webkit-tap-highlight-color:rgba(59,130,246,0.1);">' +`;
  const rowStartReplace = `'transition:background .15s;-webkit-tap-highlight-color:rgba(59,130,246,0.1);" ' +
      'data-item-name="' + esc(item.name) + '">' +
      '<div class="drag-handle" style="display:none;color:#94a3b8;font-size:20px;cursor:grab;padding-right:4px;">☰</div>' +`;
  
  if (content.includes(rowStartSearch)) {
    content = content.replace(rowStartSearch, rowStartReplace);
    fs.writeFileSync(filePath, content);
    console.log(filePath + ' patched');
  } else {
    console.log('Could not find rowStart in ' + filePath);
  }
}

patchAppJs('C:/Users/HP/Desktop/Antigravity/Master Portal/public/apps/store-dragdrop/app.js');
patchAppJs('C:/Users/HP/Desktop/Antigravity/Store Drag&Drop/Store manager V1/JavaScript.html');

function patchIndexHtml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const cssSearch = `.btn-sort-active {`;
  const cssReplace = `.sort-mode .drag-handle { display: block !important; }
    .btn-sort-active {`;
    
  if (content.includes(cssSearch)) {
    content = content.replace(cssSearch, cssReplace);
    fs.writeFileSync(filePath, content);
    console.log(filePath + ' patched');
  }
}

patchIndexHtml('C:/Users/HP/Desktop/Antigravity/Master Portal/public/apps/store-dragdrop/index.html');
patchIndexHtml('C:/Users/HP/Desktop/Antigravity/Store Drag&Drop/Store manager V1/Index.html');
