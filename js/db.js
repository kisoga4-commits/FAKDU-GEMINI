(() => {
  'use strict';

  const APP_VERSION = '9.46';
  const DB_NAME = 'FAKDU_V946_INDEXEDDB';
  const DB_VERSION = 1;
  const STORE_KV = 'kv';
  const STORE_META = 'meta';

  const KEY_MASTER_DB = 'master_db';
  const KEY_MASTER_SNAPSHOT = 'master_snapshot';
  const KEY_CLIENT_PROFILE = 'client_profile';
  const KEY_CLIENT_SESSION = 'client_session';
  const KEY_CLIENT_SHOP_ID = 'client_shop_id';
  
  const META_DEVICE_ID = 'device_install_id';
  const LEGACY_MASTER_KEY = 'FAKDU_DB_V946';
  const LEGACY_DEVICE_KEY = 'FAKDU_DEVICE_INSTALL_ID';

  function jsonClone(val) { return val == null ? val : JSON.parse(JSON.stringify(val)); }
  function randomHex(bytes=8) { 
    const arr = new Uint8Array(bytes); crypto.getRandomValues(arr); 
    return Array.from(arr, b => b.toString(16).padStart(2,'0')).join(''); 
  }
  function makeDeviceId() { return `FDI-${randomHex(5).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`; }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  let dbPromise = null;
  function openIndexedDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
        if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function withStore(storeName, mode, worker) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      Promise.resolve().then(() => worker(store)).then(v => result = v).catch(e => { try{tx.abort();}catch(_){} reject(e); });
    });
  }

  function req2prom(req) { 
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); 
  }

  async function kvGet(k) { return withStore(STORE_KV, 'readonly', s => req2prom(s.get(k))); }
  async function kvSet(k, v) { return withStore(STORE_KV, 'readwrite', s => req2prom(s.put(v, k))); }
  async function kvDelete(k) { return withStore(STORE_KV, 'readwrite', s => req2prom(s.delete(k))); }
  async function metaGet(k) { return withStore(STORE_META, 'readonly', s => req2prom(s.get(k))); }
  async function metaSet(k, v) { return withStore(STORE_META, 'readwrite', s => req2prom(s.put(v, k))); }

  async function getDeviceId() {
    let id = await metaGet(META_DEVICE_ID);
    if (id) return id;
    id = localStorage.getItem(LEGACY_DEVICE_KEY);
    if (!id) id = makeDeviceId();
    await metaSet(META_DEVICE_ID, id);
    try { localStorage.setItem(LEGACY_DEVICE_KEY, id); } catch(e){}
    return id;
  }

  async function load() {
    await getDeviceId();
    let data = await kvGet(KEY_MASTER_DB);
    if (!data) {
       const legacyRaw = localStorage.getItem(LEGACY_MASTER_KEY);
       if (legacyRaw) {
          try { data = JSON.parse(legacyRaw); await kvSet(KEY_MASTER_DB, data); } catch(e){}
       }
    }
    return data ? jsonClone(data) : null;
  }

  async function save(data) {
    const cloned = jsonClone(data);
    await kvSet(KEY_MASTER_DB, cloned);
    try { localStorage.setItem(LEGACY_MASTER_KEY, JSON.stringify(cloned)); } catch(e){}
    return true;
  }

  async function waitForReady(retry=10) {
    for (let i = 0; i < retry; i++) {
      try { await openIndexedDB(); await getDeviceId(); return true; } 
      catch (e) { await sleep(120*(i+1)); }
    }
    throw new Error('ฐานข้อมูลยังไม่พร้อม');
  }

  window.FakduDB = {
    APP_VERSION, DB_NAME, DB_VERSION,
    open: openIndexedDB, 
    ready: waitForReady,
    load, 
    save, 
    getDeviceId,
    saveSnapshot: async (snap) => kvSet(KEY_MASTER_SNAPSHOT, jsonClone(snap)),
    loadSnapshot: async () => jsonClone(await kvGet(KEY_MASTER_SNAPSHOT)),
    clearMasterData: async () => { 
        await kvDelete(KEY_MASTER_DB); 
        await kvDelete(KEY_MASTER_SNAPSHOT); 
        localStorage.removeItem(LEGACY_MASTER_KEY); 
        return true; 
    },
    loadClientSession: async () => jsonClone(await kvGet(KEY_CLIENT_SESSION)),
    saveClientSession: async (s) => kvSet(KEY_CLIENT_SESSION, jsonClone(s))
  };
})();