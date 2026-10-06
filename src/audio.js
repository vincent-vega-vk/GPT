/* Super Rigori World Cup — audio interamente sintetizzato con WebAudio (nessun file esterno) */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});

  const A = {
    ctx: null, master: null, muted: false, crowdGain: null, noiseBuf: null, vol: 0.8, started: false,
  };

  function ensure() {
    if (A.ctx) return A.ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      A.ctx = new AC();
    } catch (e) { return null; }
    A.master = A.ctx.createGain();
    A.master.gain.value = A.muted ? 0 : A.vol;
    const comp = A.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    A.master.connect(comp); comp.connect(A.ctx.destination);
    // buffer di rumore bianco (2 s)
    const len = A.ctx.sampleRate * 2;
    const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; // rumore rosa
    }
    A.noiseBuf = buf;
    return A.ctx;
  }

  function resume() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
    if (c && !A.started) { A.started = true; startCrowd(); }
  }

  function noise(dur, opts) {
    const c = ensure();
    if (!c) return null;
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = opts.type || 'bandpass';
    f.frequency.value = opts.f || 1000;
    f.Q.value = opts.q || 1;
    const g = c.createGain();
    const t = c.currentTime + (opts.delay || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.vol || 0.5, t + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (opts.fTo) f.frequency.exponentialRampToValueAtTime(opts.fTo, t + dur);
    src.connect(f); f.connect(g); g.connect(A.master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
    return g;
  }

  function tone(freq, dur, opts) {
    const c = ensure();
    if (!c) return;
    opts = opts || {};
    const o = c.createOscillator();
    o.type = opts.type || 'sine';
    const t = c.currentTime + (opts.delay || 0);
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.vol || 0.3, t + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  // ------------------------------------------------------------- folla di fondo
  function startCrowd() {
    const c = A.ctx;
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.5;
    const f2 = c.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 160;
    const g = c.createGain(); g.gain.value = 0.16;
    // lieve ondeggiamento (cori)
    const lfo = c.createOscillator(); lfo.frequency.value = 0.23;
    const lg = c.createGain(); lg.gain.value = 0.04;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(f); f.connect(f2); f2.connect(g); g.connect(A.master);
    src.start();
    A.crowdGain = g;
    A.crowdFilter = f;
  }

  const S = {
    /** livello di eccitazione del pubblico 0..1 (rumore di fondo) */
    crowd(level) {
      if (!A.crowdGain) return;
      const t = A.ctx.currentTime;
      A.crowdGain.gain.cancelScheduledValues(t);
      A.crowdGain.gain.linearRampToValueAtTime(0.1 + 0.28 * level, t + 0.6);
      A.crowdFilter.frequency.linearRampToValueAtTime(420 + 600 * level, t + 0.6);
    },
    kick(p) {
      noise(0.09, { f: 700, q: 0.8, vol: 0.5 + 0.4 * p });
      tone(140 + 40 * p, 0.14, { to: 55, vol: 0.55, type: 'sine' });
    },
    net(v) {
      const vol = Math.min(0.5, 0.15 + v * 0.012);
      noise(0.5, { type: 'highpass', f: 1800, fTo: 500, q: 0.6, vol, attack: 0.01 });
      tone(90, 0.25, { to: 50, vol: 0.3 });
    },
    post() {
      noise(0.03, { f: 3000, q: 1, vol: 0.4 });
      [740, 1180, 1790, 2560].forEach((f, i) => tone(f, 0.9 - i * 0.12, { vol: 0.2 / (i + 1), type: 'sine' }));
      tone(95, 0.18, { to: 60, vol: 0.4 });
    },
    bar() {
      noise(0.03, { f: 2500, q: 1, vol: 0.4 });
      [520, 930, 1500, 2300].forEach((f, i) => tone(f, 1.1 - i * 0.15, { vol: 0.22 / (i + 1) }));
      tone(80, 0.2, { to: 45, vol: 0.5 });
    },
    save() {
      noise(0.07, { f: 1400, q: 0.9, vol: 0.55 });
      tone(180, 0.1, { to: 90, vol: 0.4 });
    },
    catch() {
      noise(0.06, { f: 1000, q: 0.8, vol: 0.5 });
      tone(120, 0.12, { to: 70, vol: 0.5 });
    },
    bounce(v) {
      tone(110, 0.08, { to: 70, vol: Math.min(0.3, 0.05 * v) });
    },
    whistle() {
      const c = ensure();
      if (!c) return;
      const o = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      const t = c.currentTime;
      o.type = 'sine'; o2.type = 'triangle';
      o.frequency.value = 3150; o2.frequency.value = 3180;
      lfo.frequency.value = 32; lg.gain.value = 140;
      lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
      g.gain.setValueAtTime(0.18, t + 0.38);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); o2.connect(g); g.connect(A.master);
      o.start(t); o2.start(t); lfo.start(t);
      o.stop(t + 0.55); o2.stop(t + 0.55); lfo.stop(t + 0.55);
    },
    cheer(k) {
      k = k == null ? 1 : k;
      noise(2.8, { f: 900, q: 0.4, vol: 0.45 * k, attack: 0.35 });
      noise(2.2, { f: 2200, q: 0.5, vol: 0.18 * k, attack: 0.2 });
      [260, 330, 392, 523].forEach((f, i) => tone(f, 2.0, { vol: 0.035 * k, type: 'sawtooth', attack: 0.4, delay: i * 0.03, to: f * 1.04 }));
      S.crowd(Math.min(1, 0.6 + k * 0.4));
      setTimeout(() => S.crowd(0.35), 3500);
    },
    groan(k) {
      k = k == null ? 1 : k;
      noise(1.4, { f: 500, q: 0.7, vol: 0.4 * k, attack: 0.2, fTo: 260 });
      tone(240, 1.3, { to: 150, vol: 0.05 * k, type: 'sawtooth', attack: 0.2 });
    },
    boo(k) {
      noise(1.8, { type: 'lowpass', f: 380, q: 0.7, vol: 0.5 * (k || 1), attack: 0.3 });
      tone(150, 1.6, { vol: 0.07, type: 'sawtooth', attack: 0.3, to: 120 });
    },
    oooh(k) {
      noise(1.2, { f: 700, q: 0.5, vol: 0.4 * (k || 1), attack: 0.25, fTo: 1300 });
      tone(300, 1.0, { to: 480, vol: 0.05, type: 'triangle', attack: 0.2 });
    },
    special() {
      noise(0.9, { type: 'bandpass', f: 400, fTo: 5200, q: 2, vol: 0.5, attack: 0.3 });
      tone(90, 0.9, { to: 1400, vol: 0.18, type: 'sawtooth', attack: 0.5 });
      tone(55, 0.6, { vol: 0.5, delay: 0.55, to: 40 });
    },
    boom() {
      noise(0.25, { type: 'lowpass', f: 400, q: 0.5, vol: 0.9 });
      tone(70, 0.5, { to: 28, vol: 0.9 });
    },
    whoosh() {
      noise(0.5, { type: 'bandpass', f: 600, fTo: 2600, q: 1.2, vol: 0.3, attack: 0.2 });
    },
    heartbeat(k) {
      const v = 0.3 * (k || 1);
      tone(62, 0.12, { to: 42, vol: v });
      tone(58, 0.14, { to: 40, vol: v * 0.8, delay: 0.17 });
    },
    click() {
      tone(900, 0.05, { type: 'square', vol: 0.08 });
    },
    tick() {
      tone(1300, 0.03, { type: 'square', vol: 0.05 });
    },
    select() {
      tone(660, 0.07, { type: 'triangle', vol: 0.14 });
      tone(990, 0.1, { type: 'triangle', vol: 0.14, delay: 0.06 });
    },
    coin() {
      tone(1200, 0.08, { type: 'square', vol: 0.1 });
      tone(1800, 0.25, { type: 'square', vol: 0.1, delay: 0.08 });
    },
    fanfare() {
      const seq = [[392, 0], [523, 0.18], [659, 0.36], [784, 0.54], [1047, 0.8]];
      seq.forEach(([f, d]) => {
        tone(f, 0.5, { type: 'sawtooth', vol: 0.12, delay: d, attack: 0.02 });
        tone(f / 2, 0.5, { type: 'square', vol: 0.06, delay: d, attack: 0.02 });
      });
      tone(1047, 1.4, { type: 'sawtooth', vol: 0.14, delay: 1.0, attack: 0.03 });
      tone(784, 1.4, { type: 'sawtooth', vol: 0.1, delay: 1.0, attack: 0.03 });
      tone(523, 1.4, { type: 'sawtooth', vol: 0.1, delay: 1.0, attack: 0.03 });
    },
    setMuted(m) {
      A.muted = m;
      if (A.master) A.master.gain.value = m ? 0 : A.vol;
    },
    toggleMute() { S.setMuted(!A.muted); return A.muted; },
    get muted() { return A.muted; },
    resume,
  };

  PK.Audio = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
