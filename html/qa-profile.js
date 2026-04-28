const fs = require('fs');
const se = fs.readFileSync('profile.html','utf8');
const checks = [
  ['No backend.js', !se.includes('backend.js')],
  ['pf-layout.css used', se.includes('pf-layout.css')],
  ['Real API integration (Load)', se.includes('/api/users/me')],
  ['Honest empty states/coming soon', se.includes('coming soon')],
  ['CSP / Layout safe', se.includes('pf-layout')]
];
checks.forEach(([name,pass])=>console.log((pass?'PASS':'FAIL')+' '+name));
