(() => {
  'use strict';

  const firebaseConfig = {
    apiKey: 'AIzaSyC4jOmVcZp0HmmDqZCmHufnq2yyoPcvyVM',
    authDomain: 'pakdu-a26c4.firebaseapp.com',
    databaseURL: 'https://pakdu-a26c4-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'pakdu-a26c4',
    storageBucket: 'pakdu-a26c4.firebasestorage.app',
    messagingSenderId: '414809008203',
    appId: '1:414809008203:web:757dceafa78d91900d85ce',
    measurementId: 'G-2B03KJ4D68'
  };

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  function normalizeSyncPin(pin = '') {
    return String(pin || '').replace(/\D/g, '').slice(0, 6);
  }

  function resolveApi() {
    const fb = window.firebase;
    if (!fb || typeof fb.initializeApp !== 'function' || typeof fb.database !== 'function') return null;
    if (!fb.apps || !fb.apps.length) fb.initializeApp(firebaseConfig);
    const db = fb.database();
    const shopRoot = (shopId = '') => `shops/${shopId}`;
    const eventsPath = (shopId = '') => `${shopRoot(shopId)}/events`;
    const pairHostPath = (parentMachineId = '') => `pair_hosts/${String(parentMachineId || '').trim()}`;
    const pairRequestPath = (pin = '', requestId = '') => {
      const safePin = normalizeSyncPin(pin);
      return requestId
        ? `pair_requests/${safePin}/${String(requestId || '').trim()}`
        : `pair_requests/${safePin}`;
    };
    const pairSessionPath = (childMachineId = '') => `pair_sessions/${String(childMachineId || '').trim()}`;
    const PAIR_PIN_TTL_MS = 1000 * 60 * 10;
    const PAIR_REQUEST_TTL_MS = 1000 * 60 * 60 * 24;
    
    async function cleanupRequests(pin = '') {
      const safePin = normalizeSyncPin(pin);
      if (safePin.length !== 6) return;
      try {
        const snap = await db.ref(pairRequestPath(safePin)).limitToLast(120).get();
        if (!snap.exists()) return;
        const now = Date.now();
        const tasks = [];
        Object.entries(snap.val() || {}).forEach(([requestId, payload]) => {
          const row = payload && typeof payload === 'object' ? payload : {};
          const createdAt = Number(row.created_at || row.createdAt || 0);
          const isExpired = createdAt > 0 && (now - createdAt) > PAIR_REQUEST_TTL_MS;
          const status = String(row.status || 'pending').toLowerCase();
          if (isExpired || status === 'approved' || status === 'rejected') {
            tasks.push(db.ref(pairRequestPath(safePin, requestId)).remove());
          }
        });
        if (tasks.length) await Promise.all(tasks);
      } catch (_) {}
    }

    return {
      async lookupPinToShopId(pin = '') {
        return this.readSyncPin(pin);
      },
      async readSyncPin(pin = '') {
        const safePin = normalizeSyncPin(pin);
        if (safePin.length !== 6) return null;
        const snap = await db.ref('pair_hosts').orderByChild('pin').equalTo(safePin).limitToFirst(1).get();
        if (!snap.exists()) return null;
        const [masterDeviceId, payloadRaw] = Object.entries(snap.val() || {})[0] || [];
        const payload = payloadRaw && typeof payloadRaw === 'object' ? payloadRaw : {};
        const expiresAt = Number(payload.expires_at || 0);
        if (expiresAt && expiresAt < Date.now()) return null;
        return {
          pin: safePin,
          shopId: String(payload.shopId || ''),
          syncVersion: Number(payload.syncVersion || 0),
          masterDeviceId: String(masterDeviceId || payload.parentMachineId || ''),
          active: String(payload.status || 'waiting') === 'waiting',
          updatedAt: Number(payload.updatedAt || 0)
        };
      },
      async readSyncMeta(shopId = '') {
        if (!shopId) return null;
        const snap = await db.ref(`${shopRoot(shopId)}/master`).get();
        return snap.exists() ? snap.val() : null;
      },
      async writeSyncMeta(shopId = '', meta = {}) {
        if (!shopId) return;
        const safeVersion = Number(meta.syncVersion || 1);
        const safePin = normalizeSyncPin(meta.currentSyncPin || '');
        const masterPath = `${shopRoot(shopId)}/master`;
        const payload = {
          shopId,
          shopName: meta.shopName || 'FAKDU',
          masterDeviceId: meta.masterDeviceId || '',
          currentSyncPin: safePin,
          syncVersion: safeVersion,
          approvedClients: Array.isArray(meta.approvedClients) ? meta.approvedClients : [],
          clientSessions: meta.clientSessions && typeof meta.clientSessions === 'object' ? meta.clientSessions : {},
          updatedAt: Date.now()
        };
        await db.ref(masterPath).set(payload);
        if (safePin && payload.masterDeviceId) {
          await db.ref(pairHostPath(payload.masterDeviceId)).set({
            parentMachineId: payload.masterDeviceId,
            shopId,
            pin: safePin,
            syncVersion: safeVersion,
            status: 'waiting',
            expires_at: Date.now() + PAIR_PIN_TTL_MS,
            updatedAt: Date.now()
          });
          await cleanupRequests(safePin);
        }
      },
      listen(shopId = '', minTs = Date.now(), onMessage = () => {}) {
        if (!shopId) return () => {};
        const ref = db.ref(eventsPath(shopId)).limitToLast(150);
        const handler = (snap) => {
          const payload = snap.val();
          if (!payload) return;
          const isAccessRequest = payload.type === 'CLIENT_ACCESS_REQUEST';
          if (!isAccessRequest && Number(payload.createdAt || 0) < minTs) return;
          onMessage(payload);
        };
        ref.on('child_added', handler);
        return () => ref.off('child_added', handler);
      },
      listenJoinRequests(pin = '', onRequest = () => {}) {
        const safePin = normalizeSyncPin(pin);
        if (safePin.length !== 6) return () => {};
        const ref = db.ref(pairRequestPath(safePin));
        const handler = (snap) => {
          const payload = snap.val();
          if (!payload || typeof payload !== 'object') return;
          onRequest({
            ...payload,
            requestId: String(snap.key || payload.requestId || ''),
            pin: safePin
          });
        };
        ref.on('child_added', handler);
        ref.on('child_changed', handler);
        return () => {
          ref.off('child_added', handler);
          ref.off('child_changed', handler);
        };
      },
      listenClientApprovalStatus(pin = '', clientId = '', requestIdOrCb = '', maybeCb = null) {
        const safeClientId = String(clientId || '').trim();
        const safePin = normalizeSyncPin(pin);
        const requestId = typeof requestIdOrCb === 'string' ? String(requestIdOrCb || '').trim() : '';
        const onStatus = typeof requestIdOrCb === 'function' ? requestIdOrCb : maybeCb;
        if (!safeClientId || typeof onStatus !== 'function') return () => {};

        const sessionRef = db.ref(pairSessionPath(safeClientId));
        const requestRef = (safePin.length === 6 && requestId) ? db.ref(pairRequestPath(safePin, requestId)) : null;
        const stops = [];
        const pushPayload = (payload, source = '') => {
          if (!payload || typeof payload !== 'object') return;
          const requestClientId = String(payload.child_machine_id || payload.clientId || '');
          if (requestClientId && requestClientId !== safeClientId) return;
          onStatus({ ...payload, source });
        };
        const sessionHandler = (snap) => {
          if (!snap.exists()) return;
          pushPayload(snap.val(), 'session');
        };
        sessionRef.on('value', sessionHandler);
        stops.push(() => sessionRef.off('value', sessionHandler));

        if (requestRef) {
          const requestHandler = (snap) => {
            if (!snap.exists()) return;
            pushPayload(snap.val(), 'request');
          };
          requestRef.on('value', requestHandler);
          stops.push(() => requestRef.off('value', requestHandler));
        }

        return () => {
          stops.forEach((stop) => {
            try { stop(); } catch (_) {}
          });
        };
      },
      listenClient(shopId = '', clientId = '', onClient = () => {}) {
        if (!shopId || !clientId) return () => {};
        const ref = db.ref(`${shopRoot(shopId)}/clients/${clientId}`);
        const handler = (snap) => {
          if (!snap.exists()) return;
          onClient(snap.val());
        };
        ref.on('value', handler);
        return () => ref.off('value', handler);
      },
      listenOperations(shopId = '', minTs = Date.now(), onOperation = () => {}) {
        if (!shopId) return () => {};
        const ref = db.ref(`${shopRoot(shopId)}/operations`).limitToLast(200);
        const handler = (snap) => {
          const payload = snap.val();
          if (!payload || Number(payload.createdAt || 0) < minTs) return;
          onOperation(payload);
        };
        ref.on('child_added', handler);
        return () => ref.off('child_added', handler);
      },
      async send(shopId = '', message = {}) {
        if (!shopId || !message?.type) return;
        await db.ref(`${eventsPath(shopId)}/${uid()}`).set({
          ...message,
          shopId: message.shopId || shopId,
          id: message.id || uid(),
          createdAt: Date.now()
        });
      },
      async writeJoinRequest(pin = '', client = {}) {
        const safePin = normalizeSyncPin(pin || client?.pin || '');
        const clientId = String(client?.clientId || client?.child_machine_id || '').trim();
        const requestId = String(client?.requestId || uid()).trim();
        if (safePin.length !== 6 || !clientId || !requestId) return null;
        const now = Date.now();
        await db.ref(pairRequestPath(safePin, requestId)).set({
          requestId,
          pin: safePin,
          child_machine_id: clientId,
          clientId,
          child_name: String(client?.child_name || client?.profileName || client?.name || 'เครื่องลูก'),
          child_avatar: String(client?.child_avatar || client?.avatar || ''),
          shopId: String(client?.shopId || ''),
          syncVersion: Number(client?.syncVersion || 1),
          status: 'pending',
          created_at: Number(client?.created_at || now),
          updatedAt: now
        });
        return requestId;
      },
      async sendJoinRequest(pin = '', client = {}) {
        return this.writeJoinRequest(pin, client);
      },
      async resolveJoinRequest(pin = '', clientId = '', status = 'approved', extra = {}) {
        const safePin = normalizeSyncPin(pin || extra?.pin || '');
        const safeClientId = String(extra.child_machine_id || extra.clientId || clientId || '').trim();
        if (safePin.length !== 6 || !safeClientId) return;
        const safeStatus = String(status || '').toLowerCase() === 'rejected' ? 'rejected' : 'approved';
        let targetRequestId = String(extra.requestId || '').trim();
        if (!targetRequestId) {
          try {
            const snap = await db.ref(pairRequestPath(safePin))
              .orderByChild('child_machine_id')
              .equalTo(safeClientId)
              .limitToLast(1)
              .get();
            if (snap.exists()) {
              const first = Object.keys(snap.val() || {})[0] || '';
              targetRequestId = String(first || '').trim();
            }
          } catch (_) {}
        }
        if (targetRequestId) {
          await db.ref(pairRequestPath(safePin, targetRequestId)).update({
            requestId: targetRequestId,
            status: safeStatus,
            approved: safeStatus === 'approved',
            child_machine_id: safeClientId,
            clientId: safeClientId,
            signed_token: String(extra.signed_token || extra.clientSessionToken || ''),
            clientSessionToken: String(extra.clientSessionToken || extra.signed_token || ''),
            ...extra,
            updatedAt: Date.now()
          });
        }
        await db.ref(pairSessionPath(safeClientId)).set({
          child_machine_id: safeClientId,
          clientId: safeClientId,
          requestId: targetRequestId || '',
          pin: safePin,
          shopId: String(extra.shopId || ''),
          syncVersion: Number(extra.sessionSyncVersion || extra.syncVersion || 1),
          status: safeStatus,
          approved: safeStatus === 'approved',
          clientSessionToken: String(extra.clientSessionToken || extra.signed_token || ''),
          signed_token: String(extra.signed_token || extra.clientSessionToken || ''),
          approvedAt: Number(extra.approvedAt || Date.now()),
          updatedAt: Date.now()
        });
      },
      async approveClient(pin = '', clientId = '', extra = {}) {
        return this.resolveJoinRequest(pin, clientId, 'approved', extra);
      },
      async rejectClient(pin = '', clientId = '', extra = {}) {
        return this.resolveJoinRequest(pin, clientId, 'rejected', extra);
      },
      async upsertClient(shopId = '', client = {}) {
        if (!shopId || !client?.clientId) return;
        await db.ref(`${shopRoot(shopId)}/clients/${client.clientId}`).set({
          ...client,
          sessionVersion: Number(client.sessionVersion || client.sessionSyncVersion || client.syncVersion || 1),
          updatedAt: Date.now()
        });
      },
      async clearClientSessions(shopId = '') {
        if (!shopId) return;
        await db.ref(`${shopRoot(shopId)}/clients`).remove();
      },
      async writeOperation(shopId = '', operation = {}) {
        if (!shopId || !operation?.type) return;
        const opId = String(operation.opId || operation.id || uid());
        const now = Date.now();
        await db.ref(`${shopRoot(shopId)}/operations/${opId}`).set({
          ...operation,
          shopId: operation.shopId || shopId,
          opId,
          timestamp: Number(operation.timestamp || now),
          createdAt: now
        });
      },
      async writeSnapshot(shopId = '', snapshot = {}) {
        if (!shopId) return;
        await db.ref(`${shopRoot(shopId)}/snapshot`).set({
          ...snapshot,
          shopId: snapshot.shopId || shopId,
          updatedAt: Date.now()
        });
      },
      async readSnapshot(shopId = '') {
        if (!shopId) return null;
        const snap = await db.ref(`${shopRoot(shopId)}/snapshot`).get();
        return snap.exists() ? snap.val() : null;
      }
    };
  }

  window.FakduSync = { resolveApi };
  window.FakduFirebaseSync = window.FakduSync;
})();