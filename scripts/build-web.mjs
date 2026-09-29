// Baut die Web-Version und macht sie auf dem iPhone als Home-Bildschirm-App
// nutzbar (Icon, Vollbild, Name). Aufruf: node scripts/build-web.mjs
// Optional: EXPO_BASE_URL=/Fabian-Rosenbohm für GitHub Pages.
import { execSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
execSync('npx expo export -p web', { stdio: 'inherit', env: { ...process.env, CI: '1' } });

const file = 'dist/index.html';
let html = readFileSync(file, 'utf8');
const head = [
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="Haushalt">',
  '<meta name="theme-color" content="#2E6FD8">',
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png">`,
  `<link rel="manifest" href="${base}/manifest.webmanifest">`,
].join('\n    ');
html = html
  .replace(/<title>.*?<\/title>/, '<title>Haushaltsbuch</title>')
  .replace('<html lang="en">', '<html lang="de">')
  // Inhalt unter die iPhone-Statusleiste bzw. Notch führen, damit es wie eine App wirkt.
  .replace(/<meta name="viewport" content="([^"]*)"/, (m, c) =>
    c.includes('viewport-fit') ? m : `<meta name="viewport" content="${c}, viewport-fit=cover"`,
  )
  .replace('</head>', `    ${head}\n  </head>`);
writeFileSync(file, html);
// GitHub Pages liefert bei unbekannten Pfaden 404.html aus – so funktionieren auch direkte Links.
copyFileSync(file, 'dist/404.html');
console.log('Web-Version fertig in dist/');
