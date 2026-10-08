/* Build: inline di CSS e JS in un unico file HTML autosufficiente.
   Uso: node build.mjs            → dist/closer.html
        node build.mjs --artifact → dist/closer.artifact.html (frammento senza <html>/<head>/<body>) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const read = (p) => fs.readFileSync(path.join(src, p), 'utf8');

/* CSS */
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => `<style>\n${read(href)}\n</style>`);

/* JS: tutti i <script src> consecutivi diventano un solo blocco */
const scripts = [];
html = html.replace(/<script src="([^"]+)"><\/script>\s*/g, (_, s) => { scripts.push(s); return ''; });
const js = scripts.map((s) => `/* ${s} */\n${read(s)}`).join('\n');
if (js.includes('</script')) throw new Error('Il JS contiene </script: non inlinabile');
html = html.replace('</body>', () => `<script>\n${js}\n</script>\n</body>`);

fs.writeFileSync(path.join(dist, 'closer.html'), html);
console.log(`dist/closer.html · ${(html.length / 1024).toFixed(0)} KB · ${scripts.length} script`);

if (process.argv.includes('--artifact')) {
  const title = /<title>([^<]+)<\/title>/.exec(html)[1];
  const fonts = /<link href="(https:\/\/fonts\.googleapis\.com[^"]+)" rel="stylesheet">/.exec(html)[1];
  const style = /<style>[\s\S]*?<\/style>/.exec(html)[0];
  const body = /<body>([\s\S]*)<\/body>/.exec(html)[1];
  const frag = `<title>${title}</title>\n<link href="${fonts}" rel="stylesheet">\n${style}\n${body}`;
  fs.writeFileSync(path.join(dist, 'closer.artifact.html'), frag);
  console.log(`dist/closer.artifact.html · ${(frag.length / 1024).toFixed(0)} KB`);
}
