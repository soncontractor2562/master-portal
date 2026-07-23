// fix-renderrow.cjs — Safely patches renderInventoryRow in app.js for sort mode
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public/apps/store-dragdrop/app.js');
let src = fs.readFileSync(appJsPath, 'utf8');

// Find the function by a unique anchor that won't appear in JSON data
const OLD_ANCHOR = `function renderInventoryRow(item) {\n  var qty = state.invLocFilter !== 'all' ? (item.quantities[state.invLocFilter] || 0) :\n    Object.values(item.quantities).reduce(function(s, q) { return s + Math.max(0, q || 0); }, 0);\n  var locCount = Object.values(item.quantities).filter(function(q) { return q > 0; }).length;\n  var sub = state.invLocFilter !== 'all' ? state.invLocFilter : locCount + ' \u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48';`;

const occurrences = (src.split(OLD_ANCHOR).length - 1);
console.log('Occurrences of anchor:', occurrences);

if (occurrences !== 1) {
  console.error('ERROR: anchor found ' + occurrences + ' times. Aborting.');
  process.exit(1);
}

const NEW_FUNCTION_START = `function renderInventoryRow(item) {\n  var qty = state.invLocFilter !== 'all' ? (item.quantities[state.invLocFilter] || 0) :\n    Object.values(item.quantities).reduce(function(s, q) { return s + Math.max(0, q || 0); }, 0);\n\n  // Compact location chips\n  var subHtml;\n  if (state.invLocFilter !== 'all') {\n    subHtml = '<span style="font-size:11px;color:#64748b;">' + state.invLocFilter + '</span>';\n  } else {\n    var activeLocs = state.locations.filter(function(l) { return (item.quantities[l.name] || 0) > 0; });\n    var shown = activeLocs.slice(0, 2);\n    var overflow = activeLocs.length - shown.length;\n    subHtml = shown.map(function(l) {\n      return '<span style="display:inline-block;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;background:rgba(51,65,85,0.5);color:#94a3b8;padding:2px 6px;border-radius:6px;">' + getLocIcon(l) + ' ' + l.name + '</span>';\n    }).join('') + (overflow > 0 ? '<span style="font-size:10px;color:#64748b;margin-left:2px;">+' + overflow + '</span>' : '');\n    if (activeLocs.length === 0) subHtml = '<span style="font-size:11px;color:#475569;">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e2d\u0e07</span>';\n  }`;

src = src.replace(OLD_ANCHOR, NEW_FUNCTION_START);
console.log('Step 1 done - replaced function start');

// Now replace the row HTML return statement
// Look for the unique adjustBtn + return combo
const OLD_ROW = `  var adjustBtn = 'event.stopPropagation();showAdjustModal(\\\\'' +\n    esc(item.name) + '\\\\',\\\\'' +\n    esc(state.invLocFilter !== 'all' ? state.invLocFilter : '') + '\\\\')';\n\n  return (\n    // Row container: flex, no overflow, fixed height layout\n    '<div onclick=\"showItemDetail(\\\\'' + esc(item.name) + '\\\\')" style=\"' +`;

const checkOld = src.includes("var adjustBtn = 'event.stopPropagation();showAdjustModal(\\\\'");
console.log('adjustBtn line found:', checkOld);

// Let's find and replace the entire return block by line content
const lines = src.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("function renderInventoryRow") && startIdx === -1) {
    // found the function, now look for adjustBtn
  }
  if (startIdx === -1 && lines[i].includes("var adjustBtn = 'event.stopPropagation();showAdjustModal") && i > 9000) {
    startIdx = i;
    console.log('Found adjustBtn at line:', i + 1);
  }
  if (startIdx !== -1 && endIdx === -1 && lines[i].trim() === '}' && i > startIdx + 5) {
    // Check if the next line is empty or another function
    if (i + 1 < lines.length && (lines[i+1].trim() === '' || lines[i+1].trim().startsWith('/'))) {
      endIdx = i;
      console.log('Found end of renderInventoryRow at line:', i + 1);
      break;
    }
  }
}

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not locate adjustBtn/return block. startIdx=' + startIdx + ' endIdx=' + endIdx);
  process.exit(1);
}

const newBlock = [
  `  var en = esc(item.name);`,
  `  var adjustBtn = 'event.stopPropagation();showAdjustModal(\\\\'' + en + '\\\\',\\\\'' + esc(state.invLocFilter !== 'all' ? state.invLocFilter : '') + '\\\\')';\r`,
  ``,
  `  return (`,
  `    '<div onclick=\"showItemDetail(\\\\'' + en + '\\\\')"' +`,
  `    ' data-item-name=\"' + en + '\"' +`,
  `    ' draggable=\"false\"' +`,
  `    ' ondragstart=\"onInvRowDragStart(event,\\\\'' + en + '\\\\')\"' +`,
  `    ' ondragend=\"onInvRowDragEnd(event)\"' +`,
  `    ' ondragover=\"onInvRowDragOver(event)\"' +`,
  `    ' ondragleave=\"onInvRowDragLeave(event)\"' +`,
  `    ' ondrop=\"onInvRowDrop(event,\\\\'' + en + '\\\\')\"' +`,
  `    ' style=\"display:flex;align-items:center;padding:11px 12px;border-bottom:1px solid rgba(51,65,85,0.3);cursor:pointer;gap:10px;width:100%;box-sizing:border-box;transition:background .15s;\">' +`,
  ``,
  `    '<span class=\"sort-handle\" title=\"\u0e25\u0e32\u0e01\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e23\u0e35\u0e22\u0e07\">\u2261</span>' +`,
  ``,
  `    '<div style=\"flex:1;min-width:0;overflow:hidden;\">' +`,
  `    '<div style=\"font-size:13px;font-weight:600;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">' + item.name + '</div>' +`,
  `    '<div style=\"font-size:11px;margin-top:3px;display:flex;gap:4px;align-items:center;overflow:hidden;\">' + subHtml + '</div>' +`,
  `    '</div>' +`,
  ``,
  `    '<div style=\"display:flex;align-items:center;gap:8px;flex-shrink:0;\">' +`,
  `    '<div style=\"text-align:center;\">' +`,
  `    '<span style=\"display:inline-block;min-width:40px;text-align:center;padding:4px 8px;border-radius:8px;font-size:14px;font-weight:800;font-family:Outfit,sans-serif;background:' + qtyBg + ';color:' + qtyColor + ';border:' + qtyBorder + ';\">' + qty + '</span>' +`,
  `    '<div style=\"font-size:10px;color:#64748b;margin-top:2px;\">' + item.unit + '</div>' +`,
  `    '</div>' +`,
  `    '<div class=\"adj-btn-wrap\">' +`,
  `    '<button onclick=\"' + adjustBtn + '\" style=\"background:rgba(217,119,6,0.15);border:1px solid rgba(217,119,6,0.3);color:#fbbf24;padding:8px;border-radius:9px;cursor:pointer;font-size:14px;flex-shrink:0;line-height:1;\" title=\"\u0e1b\u0e23\u0e31\u0e1a\u0e22\u0e2d\u0e14\">\u2696\ufe0f</button>' +`,
  `    '</div>' +`,
  `    '</div>' +`,
  ``,
  `    '</div>'`,
  `  );`,
  `}`
];

lines.splice(startIdx, endIdx - startIdx + 1, ...newBlock);
src = lines.join('\n');

fs.writeFileSync(appJsPath, src, 'utf8');
console.log('SUCCESS: app.js patched!');
const fnCount = (src.match(/function renderInventoryRow/g) || []).length;
console.log('renderInventoryRow count:', fnCount, '(should be 1)');
