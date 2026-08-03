const fs = require('fs');
let t = fs.readFileSync('public/apps/store-dragdrop/index.html', 'utf8');

t = t.replace(/<div class="page" id="page-inventory">[\s\S]*?<button class="icon-btn noti-bell-btn"[\s\S]*?<\/button>/, (match) => {
  return match.replace(/<button class="icon-btn noti-bell-btn"[\s\S]*?<\/button>/, '');
});

t = t.replace(/<div class="page" id="page-pending">[\s\S]*?<button class="icon-btn noti-bell-btn"[\s\S]*?<\/button>/, (match) => {
  return match.replace(/<button class="icon-btn noti-bell-btn"[\s\S]*?<\/button>/, '');
});

t = t.replace(/<div class="page" id="page-history">[\s\S]*?<button class="icon-btn noti-bell-btn"[\s\S]*?<\/button>/, (match) => {
  return match.replace(/<button class="icon-btn noti-bell-btn"[\s\S]*?<\/button>/, '');
});

// Update the badge styling on the remaining one to make sure the number is visible
t = t.replace(/<span class="noti-badge"[^>]*>0<\/span>/, 
  `<span class="noti-badge" style="display:none; position:absolute; top:-4px; right:-4px; background:#ef4444; color:#fff; font-size:10px; font-weight:bold; height:16px; min-width:16px; border-radius:8px; display:flex; align-items:center; justify-content:center; box-sizing:border-box; padding:0 4px; box-shadow:0 0 0 2px #fff;">0</span>`
);
// Also need to make sure the inline display:none doesn't override the style if we are replacing it later... wait, if I put `display:none` here, it is inline. In app.js we do `b.style.display = 'block'`. If I change the inline style to use flex, I should probably also update app.js to use flex!

fs.writeFileSync('public/apps/store-dragdrop/index.html', t);
console.log('Removed bells from other pages and updated badge style');
