const fs = require('fs');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0d1117" />
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="18" fill="#00c2ff">PF</text>
  <path d="M 0 32 L 32 0" stroke="#a371f7" stroke-width="2" opacity="0.3"/>
</svg>`;

fs.writeFileSync('favicon.svg', svgContent);

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const linkTag = '<link rel="icon" href="favicon.svg" type="image/svg+xml"/>';

let updatedCount = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('favicon.svg')) {
    content = content.replace('</head>', '  ' + linkTag + '\n</head>');
    fs.writeFileSync(file, content);
    updatedCount++;
  }
}

console.log('Created favicon.svg and updated ' + updatedCount + ' files.');
