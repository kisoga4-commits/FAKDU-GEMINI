(() => {
  'use strict';

  const LS_FORCE_CLIENT_MODE = 'FAKDU_FORCE_CLIENT_MODE';
  const LS_PENDING_PAIR_REQUEST_ID = 'FAKDU_PENDING_PAIR_REQUEST_ID';
  const CLIENT_PAGE = 'client.html';
  const INDEX_PAGE = 'index.html';

  function readClientSession() {
    try {
      const raw = localStorage.getItem('FAKDU_CLIENT_SESSION');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // ต้องมี Token ยืนยันสิทธิ์เท่านั้น
      return parsed && parsed.clientSessionToken ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function isClientPage() {
    return /client\.html$/i.test(window.location.pathname || '');
  }

  function redirectTo(path) {
    if (!path) return;
    window.location.replace(path);
  }

  function readPendingConnect() {
    const pin = String(localStorage.getItem('FAKDU_PENDING_CLIENT_PIN') || '').trim();
    const shopId = String(localStorage.getItem('FAKDU_PENDING_MASTER_SHOP_ID') || '').trim();
    const clientId = String(localStorage.getItem('FAKDU_CLIENT_ID') || '').trim();
    const requestId = String(localStorage.getItem(LS_PENDING_PAIR_REQUEST_ID) || '').trim();
    return { pin, shopId, clientId, requestId };
  }

  function listenApprovalAndRedirectIfNeeded() {
    if (isClientPage()) return;
    const hasSession = !!readClientSession();
    if (hasSession) return;
    
    const pending = readPendingConnect();
    if (!pending.pin || !pending.clientId) return;
    
    // เรียกใช้ Firebase Sync API ที่เราปรับปรุงใหม่
    const api = window.FakduSync?.resolveApi?.() || window.FakduFirebaseSync?.resolveApi?.();
    if (!api) return;
    
    console.log('📡 [CLIENT] Waiting for Master Approval...', pending);
    
    const listenFn = typeof api.listenClientApprovalStatus === 'function'
      ? api.listenClientApprovalStatus.bind(api)
      : api.listenClient?.bind(api);
      
    if (typeof listenFn !== 'function') return;

    listenFn(pending.pin, pending.clientId, pending.requestId, async (payload) => {
      console.log('📡 [CLIENT] Approval Status Update:', payload);
      if (!payload) return;
      
      // ถ้าเครื่องแม่อนุมัติ และส่ง Token กลับมา
      if (payload.approved === true && (payload.clientSessionToken || payload.signed_token)) {
        const session = {
          shopId: payload.shopId || pending.shopId || '',
          clientId: pending.clientId,
          profileName: String(localStorage.getItem('FAKDU_CLIENT_PROFILE_NAME') || 'เครื่องลูก'),
          clientSessionToken: payload.clientSessionToken || payload.signed_token || '',
          syncVersion: Number(payload.sessionSyncVersion || payload.syncVersion || 1)
        };
        
        localStorage.setItem('FAKDU_CLIENT_SESSION', JSON.stringify(session));
        localStorage.setItem(LS_FORCE_CLIENT_MODE, 'true');
        
        if (window.FakduDB?.saveClientSession) {
          await window.FakduDB.saveClientSession(session);
        }
        
        localStorage.removeItem(LS_PENDING_PAIR_REQUEST_ID);
        redirectTo(CLIENT_PAGE);
      }
      
      // ถ้าเครื่องแม่ปฏิเสธ
      if (payload.approved === false || String(payload.status || '').toLowerCase() === 'rejected') {
        localStorage.removeItem(LS_FORCE_CLIENT_MODE);
        // สามารถเพิ่มแจ้งเตือนตรงนี้ได้ถ้าต้องการ
      }
    });
  }

  const ready = () => {
    const hasSession = !!readClientSession();
    const forceClientMode = localStorage.getItem(LS_FORCE_CLIENT_MODE) === 'true';

    // ถ้ามี Session แล้ว แต่ดันอยู่หน้า Master (index) ให้เตะไปหน้า Client
    if (!isClientPage() && hasSession) {
      redirectTo(CLIENT_PAGE);
      return;
    }

    // ถ้าอยู่หน้า Client แต่ไม่มี Session และไม่ได้บังคับเข้า ให้เตะกลับไปหน้า Master
    if (isClientPage() && !hasSession && !forceClientMode) {
      localStorage.removeItem(LS_FORCE_CLIENT_MODE);
      redirectTo(INDEX_PAGE);
      return;
    }
    
    listenApprovalAndRedirectIfNeeded();
    document.documentElement?.setAttribute('data-client-core', 'ready');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
