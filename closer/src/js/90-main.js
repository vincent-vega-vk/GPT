/* CLOSER · avvio */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, S = UI.S;

  document.addEventListener('keydown', (e) => {
    if (UI.modalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const num = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
    const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON' && !document.activeElement.classList.contains('choice');
    if (S.screen === 'play') {
      if (num >= 0) UI.playKey(num);
      else if ((e.key === 'Enter' || e.key === ' ') && !onButton) { e.preventDefault(); UI.playNext(); }
    } else if (S.screen === 'dojo') {
      if (num >= 0) UI.dojoKey(num);
      else if ((e.key === 'Enter' || e.key === ' ') && !onButton) { e.preventDefault(); UI.dojoAdvance(); }
    }
  });

  const boot = () => {
    UI.applyTheme();
    UI.go('home');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  CL.booted = true;
})(typeof window !== 'undefined' ? window : globalThis);
