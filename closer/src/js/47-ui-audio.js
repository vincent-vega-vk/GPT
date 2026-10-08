/* CLOSER · ambiente sonoro sintetico per scenario (WebAudio). Attivo solo con l'audio acceso e dopo un gesto dell'utente. */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui;
  let ctx = null, want = null, live = null, noiseBuf = {};

  const getCtx = () => {
    const AC = g.AudioContext || g.webkitAudioContext;
    if (!AC) return null;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const noise = (type) => {
    if (noiseBuf[type]) return noiseBuf[type];
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else d[i] = w;
    }
    noiseBuf[type] = buf;
    return buf;
  };

  /* ogni preset: rumore filtrato + eventuali toni + modulazione lenta */
  const PRESETS = {
    lab: { n: 'white', lp: 3200, hp: 500, g: 0.010, hum: [[100, 0.004]] },
    factory: { n: 'brown', lp: 520, hp: 0, g: 0.045, hum: [[50, 0.006]], pulse: { f: 55, every: 1.4, g: 0.05 } },
    office: { n: 'pink', lp: 1300, hp: 80, g: 0.016, hum: [] },
    public: { n: 'pink', lp: 950, hp: 90, g: 0.015, hum: [[50, 0.005]] },
    retail: { n: 'pink', lp: 2200, hp: 300, g: 0.011, hum: [[220, 0.0025], [277, 0.002]], lfo: 0.08 },
    clinic: { n: 'white', lp: 2600, hp: 600, g: 0.009, hum: [[120, 0.004], [240, 0.002]] },
    port: { n: 'brown', lp: 760, hp: 0, g: 0.05, hum: [], lfo: 0.12, lfoDepth: 0.6 },
    control: { n: 'pink', lp: 1800, hp: 120, g: 0.012, hum: [[60, 0.007], [120, 0.004]] },
  };

  function build(id) {
    const P = PRESETS[id] || PRESETS.office;
    const c = ctx, master = c.createGain();
    master.gain.value = 0.0001;
    master.connect(c.destination);
    const stopFns = [];
    const src = c.createBufferSource();
    src.buffer = noise(P.n); src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = P.lp;
    let node = src.connect(lp);
    if (P.hp) { const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = P.hp; node = node.connect(hp); }
    const ng = c.createGain(); ng.gain.value = P.g;
    node.connect(ng).connect(master);
    src.start(); stopFns.push(() => { try { src.stop(); } catch (e) { /* già fermo */ } });
    if (P.lfo) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = P.lfo; lg.gain.value = P.g * (P.lfoDepth || 0.5);
      l.connect(lg).connect(ng.gain); l.start(); stopFns.push(() => { try { l.stop(); } catch (e) { /* noop */ } });
    }
    (P.hum || []).forEach(([f, gv]) => {
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sine'; o.frequency.value = f; og.gain.value = gv;
      o.connect(og).connect(master); o.start(); stopFns.push(() => { try { o.stop(); } catch (e) { /* noop */ } });
    });
    if (P.pulse) {
      const iv = setInterval(() => {
        if (!live || live.id !== id) return;
        const o = c.createOscillator(), og = c.createGain(), t = c.currentTime;
        o.type = 'sine'; o.frequency.setValueAtTime(P.pulse.f, t); o.frequency.exponentialRampToValueAtTime(P.pulse.f * 0.6, t + 0.18);
        og.gain.setValueAtTime(P.pulse.g, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(og).connect(master); o.start(t); o.stop(t + 0.25);
      }, P.pulse.every * 1000);
      stopFns.push(() => clearInterval(iv));
    }
    master.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.4);
    return { id, master, stop: () => { stopFns.forEach((fn) => fn()); try { master.disconnect(); } catch (e) { /* noop */ } } };
  }

  function stopLive() {
    if (!live) return;
    const l = live; live = null;
    try { l.master.gain.cancelScheduledValues(ctx.currentTime); l.master.gain.setValueAtTime(Math.max(l.master.gain.value, 0.0001), ctx.currentTime); l.master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8); } catch (e) { /* noop */ }
    setTimeout(() => l.stop(), 900);
  }

  UI.ambience = {
    start(id) {
      want = id;
      this.refresh();
    },
    refresh() {
      try {
        if (!UI.settings.sound || !want) { stopLive(); return; }
        if (!getCtx()) return;
        if (live && live.id === want) return;
        stopLive();
        live = build(want);
      } catch (e) { /* audio non disponibile */ }
    },
    stop() { want = null; try { if (ctx) stopLive(); } catch (e) { /* noop */ } },
  };
})(typeof window !== 'undefined' ? window : globalThis);
