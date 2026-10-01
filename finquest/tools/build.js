#!/usr/bin/env node
/* Build: unisce i contenuti in js/content.js e crea dist/finquest.html (file unico, funziona offline)
   e dist/artifact.html (stesso contenuto senza lo scheletro html/head/body). */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const cdir = path.join(ROOT, 'content');
const files = fs.readdirSync(cdir).filter((f) => /^L\d{3}\.js$/.test(f)).sort();
const bundle = '/* FinQuest — contenuti generati da tools/build.js: non modificare a mano, modifica content/LNNN.js */\n' +
  files.map((f) => `/* ${f} */\n` + fs.readFileSync(path.join(cdir, f), 'utf8').trim()).join('\n');
fs.writeFileSync(path.join(ROOT, 'js', 'content.js'), bundle + '\n');

const order = ['util', 'curriculum', 'charts', 'calc', 'sims', 'engine', 'content', 'app'];
const js = order.map((f) => rd(`js/${f}.js`)).join('\n;\n').replace(/<\/script/gi, '<\\/script') + '\n;FQ.App.start();';
const css = rd('css/style.css');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@500;600;700&family=Nunito:wght@500;600;700;800&display=swap">';
const body = '<div id="app"></div>\n<div id="lesson" hidden></div>\n<div id="modal" hidden></div>\n<div id="toast" role="status" aria-live="polite"></div>';
const title = '<title>FinQuest</title>';
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const full = `<!doctype html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${title}\n${fonts}\n<style>\n${css}\n</style>\n</head>\n<body>\n${body}\n<script>\n${js}\n</script>\n</body>\n</html>\n`;
fs.writeFileSync(path.join(ROOT, 'dist', 'finquest.html'), full);
const art = `${title}\n${fonts}\n<style>\n${css}\n</style>\n${body}\n<script>\ndocument.documentElement.lang = 'it';\n${js}\n</script>\n`;
fs.writeFileSync(path.join(ROOT, 'dist', 'artifact.html'), art);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log(`${files.length} livelli · js/content.js ${kb(bundle)} · dist/finquest.html ${kb(full)}`);
