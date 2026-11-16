// Static starfield behind the app, drawn once per size. The pattern changes with the date.
import { hash } from './oracolo.js';

export function accendiStelle(canvas, seme) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function disegna() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const quante = Math.round((w * h) / 4200);
    for (let i = 0; i < quante; i++) {
      const a = hash(`${seme}|${i}|a`), b = hash(`${seme}|${i}|b`);
      const x = (a % 10000) / 10000 * w;
      const y = (b % 10000) / 10000 * h;
      const grande = (a >>> 16) % 23 === 0;
      const raggio = grande ? 1.5 : 0.4 + ((b >>> 14) % 80) / 100;
      ctx.globalAlpha = grande ? 0.95 : 0.2 + ((a >>> 20) % 55) / 100;
      ctx.fillStyle = (b >>> 22) % 9 === 0 ? '#d9ff3f' : '#f3efe4';
      ctx.beginPath();
      ctx.arc(x, y, raggio, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let attesa = 0;
  window.addEventListener('resize', () => {
    clearTimeout(attesa);
    attesa = setTimeout(disegna, 150);
  });
  disegna();
}
