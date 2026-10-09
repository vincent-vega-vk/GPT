/* CLOSER · avvio */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, S = UI.S;

  document.addEventListener('keydown', (e) => {
    if (UI.modalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const num = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
    /* un pulsante col focus si attiva da solo con Invio/Spazio: non intercettiamo */
    const ae = document.activeElement;
    const onButton = !!(ae && ae.tagName === 'BUTTON' && !ae.disabled);
    const root = UI.$('#app') || document;
    const clickNth = (sel, n) => { const b = root.querySelectorAll(sel)[n]; if (b && !b.disabled) { b.click(); return true; } return false; };
    const enter = e.key === 'Enter' || e.key === ' ';
    if (S.screen === 'play') {
      if (num >= 0) UI.playKey(num);
      else if ((e.key === 'Enter' || e.key === ' ') && !onButton) { e.preventDefault(); UI.playNext(); }
    } else if (S.screen === 'forecast') {
      if (num >= 0) UI.fcKey(num);
      else if ((e.key === 'Enter' || e.key === ' ') && !onButton) { e.preventDefault(); UI.fcAdvance(); }
    } else if (S.screen === 'closing') {
      if ((e.key === 'Enter' || e.key === ' ') && !onButton) { e.preventDefault(); UI.fcAdvance(); }
    } else if (S.screen === 'event') {
      /* interludi: 1-N scelgono, Invio prosegue dopo l'esito */
      if (num >= 0) { if (clickNth('.choice:not([disabled])', num)) e.preventDefault(); }
      else if (enter && !onButton) { const b = root.querySelector('[data-autofocus], [data-next]'); if (b) { e.preventDefault(); b.click(); } }
    } else if (S.screen === 'debrief') {
      if (enter && !onButton) { const b = root.querySelector('[data-next]') || root.querySelector('.btn--primary'); if (b) { e.preventDefault(); b.click(); } }
    } else if (S.screen === 'dojo') {
      if (num >= 0) UI.dojoKey(num);
      else if ((e.key === 'Enter' || e.key === ' ') && !onButton) { e.preventDefault(); UI.dojoAdvance(); }
    }
  });

  /* ricaricare la pagina cancella il trimestre in corso: meglio avvisare (il browser mostra il suo messaggio) */
  window.addEventListener('beforeunload', (e) => {
    const run = S.run, inGame = run && !['home', 'summary'].includes(S.screen) && (S.screen === 'play' || S.screen === 'forecast' || S.screen === 'closing' || (run.mode === 'career' && run.results.length > 0));
    if (inGame) { e.preventDefault(); e.returnValue = ''; }
  });

  const boot = () => {
    UI.applyTheme();
    UI.go('home');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  CL.booted = true;
})(typeof window !== 'undefined' ? window : globalThis);
