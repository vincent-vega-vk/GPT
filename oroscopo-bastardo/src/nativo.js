// Thin bridge to the native shell. Every call degrades to a web fallback or a no-op.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NOTIFICHE } from './testi.js';
import { hash } from './oracolo.js';

export const nativo = Capacitor.isNativePlatform();

export function avvio() {
  if (!nativo) return;
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
}

export function tocco(forte = false) {
  if (!nativo) return;
  Haptics.impact({ style: forte ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
}

// Returns 'condiviso', 'copiato' or 'annullato'.
export async function condividi(titolo, testo) {
  try {
    if (nativo) {
      await Share.share({ title: titolo, text: testo, dialogTitle: titolo });
      return 'condiviso';
    }
    if (navigator.share) {
      await navigator.share({ title: titolo, text: testo });
      return 'condiviso';
    }
    await navigator.clipboard.writeText(testo);
    return 'copiato';
  } catch (e) {
    if (e && (e.name === 'AbortError' || /cancel/i.test(e.message || ''))) return 'annullato';
    try {
      await navigator.clipboard.writeText(testo);
      return 'copiato';
    } catch {
      return 'annullato';
    }
  }
}

const GIORNI_PROGRAMMATI = 14;
const ID_BASE = 7000;

// Schedules one notification a day for the next two weeks, each with a different line.
// Re-run at every launch: if the app is never opened again, the reminders stop on their own.
export async function programmaNotifiche(attive, ora) {
  if (!nativo) return 'non-disponibile';
  const ids = Array.from({ length: GIORNI_PROGRAMMATI }, (_, i) => ({ id: ID_BASE + i }));
  try {
    await LocalNotifications.cancel({ notifications: ids });
    if (!attive) return 'spente';
    let permesso = await LocalNotifications.checkPermissions();
    if (permesso.display !== 'granted') permesso = await LocalNotifications.requestPermissions();
    if (permesso.display !== 'granted') return 'negate';

    const [h, m] = ora.split(':').map(Number);
    const adesso = new Date();
    const notifications = [];
    for (let i = 0; notifications.length < GIORNI_PROGRAMMATI; i++) {
      const quando = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() + i, h, m, 0);
      if (quando <= adesso) continue;
      const riga = NOTIFICHE[hash(`notifica|${quando.toDateString()}`) % NOTIFICHE.length];
      notifications.push({
        id: ID_BASE + notifications.length,
        title: 'Oroscopo Bastardo',
        body: riga,
        schedule: { at: quando, allowWhileIdle: true },
      });
    }
    await LocalNotifications.schedule({ notifications });
    return 'attive';
  } catch {
    return 'errore';
  }
}
