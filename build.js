#!/usr/bin/env node
/* Unisce HTML + CSS + JS in un unico file.
 *   node build.js                -> dist/super-rigori.html (documento completo, apribile ovunque)
 *   node build.js --fragment out -> frammento senza <html>/<head>/<body> (per la pubblicazione come pagina)
 */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const css = read('css/style.css');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const js = scripts.map((f) => `/* ---- ${f} ---- */\n` + read(f).replace(/<\/script/gi, '<\\/script')).join('\n');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers&display=swap">';
const body = html.slice(html.indexOf('<div id="app">'), html.indexOf('<script src='));
const argFrag = process.argv.indexOf('--fragment');
if (argFrag > 0) {
  const out = process.argv[argFrag + 1];
  fs.writeFileSync(out, `<title>Super Rigori World Cup</title>\n${fonts}\n<style>\n${css}\n</style>\n${body}\n<script>\n${js}\n</script>\n`);
  console.log('frammento scritto:', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
} else {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const out = path.join(root, 'dist', 'super-rigori.html');
  fs.writeFileSync(out, `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#060918">
<title>Super Rigori World Cup</title>
${fonts}
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`);
  console.log('scritto:', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
}
