import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Relative base: the same build runs inside the iOS shell (capacitor://) and from any web folder.
export default defineConfig({
  base: './',
  define: { __VERSIONE__: JSON.stringify(version) },
  build: { outDir: 'dist', target: 'es2020', assetsInlineLimit: 0 },
  server: { host: true },
});
