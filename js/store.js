/*
 * SIMSOC 6 (remake) - save slots
 * IndexedDB holds the saves (a whole football world is ~1 MB, too big to be
 * comfortable in localStorage); localStorage is a fallback when IndexedDB
 * is unavailable. Each slot stores the serialized game plus a small meta
 * record (club, season, date) for the load screen.
 */
;(function (root) {
  'use strict';
  const DB = 'simsoc6', STORE = 'saves', LS = 'simsoc6.v2.';
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      try {
        if (!root.indexedDB) return reject(new Error('no indexedDB'));
        const req = root.indexedDB.open(DB, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
    return dbp;
  }
  function tx(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
      const r = fn(st);
      t.oncomplete = () => resolve(r && r.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }
  const lsGet = k => { try { return localStorage.getItem(LS + k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(LS + k, v); return true; } catch (e) { return false; } };
  const lsDel = k => { try { localStorage.removeItem(LS + k); } catch (e) { /* ignore */ } };

  const Store = {
    save(slot, data, meta) {
      const rec = { data: data, meta: Object.assign({ savedAt: Date.now() }, meta || {}) };
      return tx('readwrite', st => st.put(rec, slot)).then(() => true)
        .catch(() => lsSet(slot, JSON.stringify(rec)));
    },
    load(slot) {
      return tx('readonly', st => st.get(slot)).then(rec => (rec ? rec.data : null))
        .catch(() => { const raw = lsGet(slot); return raw ? JSON.parse(raw).data : null; });
    },
    meta(slot) {
      return tx('readonly', st => st.get(slot)).then(rec => (rec ? rec.meta : null))
        .catch(() => { const raw = lsGet(slot); return raw ? JSON.parse(raw).meta : null; });
    },
    list(slots) { return Promise.all(slots.map(s => Store.meta(s).then(m => ({ slot: s, meta: m })).catch(() => ({ slot: s, meta: null })))); },
    remove(slot) { return tx('readwrite', st => st.delete(slot)).then(() => true).catch(() => { lsDel(slot); return true; }); }
  };
  root.SimSocStore = Store;
})(typeof self !== 'undefined' ? self : this);
