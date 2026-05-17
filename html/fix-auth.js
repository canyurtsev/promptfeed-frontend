const fs = require('fs');
const path = require('path');
const dir = 'c:/Promtfeed/html/js/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Add skeleton loader
  const before = 'if (!token) { guestNav(area); showAds(); return; }\n  try {';
  const after = 'if (!token) { guestNav(area); showAds(); return; }\n  area.innerHTML = \'<div class="pf-spinner" style="width:20px;height:20px;margin:5px"></div>\';\n  try {';
  if (content.includes(before)) {
    content = content.replace(before, after);
    changed = true;
  } else {
    const before2 = 'if (!token) {\n    guestNav(area);\n    return;\n  }\n\n  try {';
    const after2 = 'if (!token) {\n    guestNav(area);\n    return;\n  }\n  area.innerHTML = \'<div class="pf-spinner" style="width:20px;height:20px;margin:5px"></div>\';\n\n  try {';
    if (content.includes(before2)) {
      content = content.replace(before2, after2);
      changed = true;
    }
  }

  const beforeComm = 'if (!token) {\n    guestNav(area);\n    renderComposer();\n    return;\n  }\n\n  try {';
  const afterComm = 'if (!token) {\n    guestNav(area);\n    renderComposer();\n    return;\n  }\n  area.innerHTML = \'<div class="pf-spinner" style="width:20px;height:20px;margin:5px"></div>\';\n\n  try {';
  if (content.includes(beforeComm)) {
    content = content.replace(beforeComm, afterComm);
    changed = true;
  }

  // 2. Fix empty avatar circle
  const avatarRegex = /<div class="pf-avatar" id="user-avatar"([^>]*)><\/div>/g;
  if (avatarRegex.test(content)) {
    content = content.replace(avatarRegex, '<div class="pf-avatar" id="user-avatar"$1>${currentUser.avatarUrl ? \'\' : esc(String(currentUser.username || currentUser.fullName || currentUser.email || \'A\')[0].toUpperCase())}</div>');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', file);
  }
}
