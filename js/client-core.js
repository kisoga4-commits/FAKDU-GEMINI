<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#800000">
  <title>FAKDU v9.46 - Client</title>

  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="icon.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/html5-qrcode"></script>
  <link rel="stylesheet" href="style.css">

  <style>
    :root {
      --primary: #800000;
      --bg: #f8fafc;
      --soft: #f3f4f6;
      --ink: #111827;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Prompt', sans-serif;
      background: var(--bg);
      color: var(--ink);
      margin: 0;
      min-height: 100vh;
      overscroll-behavior-y: contain;
    }
    .theme-bg { background: var(--primary); }
    .theme-text { color: var(--primary); }
    .theme-border { border-color: color-mix(in srgb, var(--primary) 40%, white 60%); }
    .glass-header {
      background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 100%, black 0%), color-mix(in srgb, var(--primary) 85%, black 15%));
      color: white;
      padding: 14px 16px;
      box-shadow: 0 12px 28px rgba(0,0,0,.18);
    }
    .nav-tab.active {
      color: var(--primary);
      border-bottom: 3px solid var(--primary);
      font-weight: 900;
    }
    .unit-card {
      border-radius: 20px;
      background: white;
      border: 1px solid #e5e7eb;
      box-shadow: 0 8px 24px rgba(15,23,42,.06);
      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
    }
    .unit-card:active { transform: scale(.98); }
    .unit-card.active { border-color: var(--primary); box-shadow: 0 12px 28px rgba(0,0,0,.1); }
    .status-idle { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
    .status-active { background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%); }
    .status-checkout { background: linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%); }
    .menu-card {
      background: white;
      border-radius: 18px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(15,23,42,.05);
    }
    .hide-scroll::-webkit-scrollbar { display: none; }
    .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    .sheet {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: none;
      background: rgba(15,23,42,.4);
      align-items: end;
      justify-content: center;
      padding: 0;
    }
    .sheet.open { display: flex; }
    .sheet-panel {
      width: 100%;
      max-width: 560px;
      background: white;
      border-radius: 28px 28px 0 0;
      max-height: 88vh;
      overflow: auto;
      box-shadow: 0 -12px 40px rgba(15,23,42,.22);
    }
    .modal {
      position: fixed;
      inset: 0;
      z-index: 90;
      display: none;
      background: rgba(15,23,42,.45);
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal.open { display: flex; }
    .toast {
      position: fixed;
      left: 50%;
      bottom: 86px;
      transform: translateX(-50%) translateY(24px);
      background: rgba(17,24,39,.92);
      color: white;
      font-size: 13px;
      font-weight: 800;
      padding: 12px 18px;
      border-radius: 999px;
      opacity: 0;
      pointer-events: none;
      transition: all .22s ease;
      z-index: 120;
      max-width: calc(100vw - 32px);
      text-align: center;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .fab-shadow { box-shadow: 0 12px 26px rgba(0,0,0,.18); }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="min-h-screen w-full max-w-[560px] mx-auto bg-white shadow-sm">

    <header class="glass-header relative">
      <div class="flex items-center gap-3">
        <div class="relative w-14 h-14 shrink-0">
          <div id="client-online-dot" class="absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-white bg-red-500"></div>
          <img id="client-shop-logo" src="icon.png" alt="logo" class="w-full h-full rounded-2xl object-cover bg-white border-2 border-white">
        </div>

        <div class="flex-1 min-w-0">
          <div id="client-shop-name" class="text-xl font-black truncate">FAKDU</div>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span id="client-online-chip" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/95 text-red-600">OFFLINE</span>
            <span id="client-approval-chip" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/15 border border-white/25">ยังไม่เชื่อม</span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button id="btn-open-connect" onclick="openJoinSheet()" class="w-11 h-11 rounded-2xl bg-white/95 text-gray-700 shadow-md text-xl border border-white/70">📱</button>
          <button id="btn-open-client-settings" onclick="switchClientTab('settings', this)" class="w-11 h-11 rounded-2xl bg-white/95 text-gray-700 shadow-md text-lg border border-white/70">⚙️</button>
        </div>
      </div>

      <div class="mt-3 flex items-center gap-2">
        <div class="w-10 h-10 rounded-full overflow-hidden bg-white/90 flex items-center justify-center shadow-sm border border-white/50">
          <img id="client-avatar-mini" src="" alt="avatar" class="w-full h-full object-cover hidden">
          <span id="client-avatar-mini-fallback" class="text-gray-700 font-black">C</span>
        </div>
        <div class="min-w-0 flex-1">
          <div id="client-profile-name-header" class="text-sm font-black truncate">เครื่องลูก</div>
          <div id="client-profile-sub" class="text-[10px] text-white/80 font-bold truncate">ยังไม่ได้รับอนุมัติ</div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-[10px] text-white/70 font-bold">คิวค้างส่ง</div>
          <div id="pending-op-badge" class="text-lg font-black">0</div>
        </div>
      </div>
    </header>

    <nav id="client-main-nav" class="hidden bg-white border-b sticky top-0 z-20">
      <div class="grid grid-cols-3">
        <button id="tab-client-units" class="nav-tab active py-3 text-sm font-black text-gray-500" onclick="switchClientTab('units', this)">โต๊ะ/คิว</button>
        <button id="tab-client-bill" class="nav-tab py-3 text-sm font-black text-gray-500" onclick="switchClientTab('bill', this)">เช็คบิล</button>
        <button id="tab-client-settings-bottom" class="nav-tab py-3 text-sm font-black text-gray-500" onclick="switchClientTab('settings', this)">ตั้งค่า</button>
      </div>
    </nav>

    <main>
      <section id="screen-client-wait" class="p-4">
        <div class="bg-white rounded-[24px] border shadow-sm p-5">
          <div class="text-lg font-black text-gray-800">เชื่อมต่อเครื่องลูก</div>
          <div class="text-sm text-gray-500 font-bold mt-1">กรอก PIN หรือสแกน QR จากเครื่องแม่ แล้วรอเครื่องแม่อนุมัติ</div>

          <div class="mt-5 space-y-3">
            <input id="join-shop-id" type="text" placeholder="รหัสร้าน (ถ้ามี)" class="w-full rounded-2xl border px-4 py-3 font-bold outline-none">
            <input id="join-pin" type="text" inputmode="numeric" maxlength="6" placeholder="PIN เครื่องแม่" class="w-full rounded-2xl border px-4 py-3 text-center text-2xl tracking-[0.35em] font-black outline-none">
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3">
            <button onclick="submitJoinRequest()" class="py-3 rounded-2xl theme-bg text-white font-black fab-shadow">ขอเข้าใช้งาน</button>
            <button onclick="openClientScanner()" class="py-3 rounded-2xl bg-gray-900 text-white font-black">สแกน QR</button>
          </div>

          <div class="mt-4 rounded-2xl bg-gray-50 border p-4">
            <div class="text-[11px] font-black text-gray-500">สถานะ</div>
            <div id="join-status-text" class="mt-1 text-base font-black text-gray-800">ยังไม่ได้ส่งคำขอ</div>
            <div id="join-status-hint" class="mt-1 text-xs font-bold text-gray-500">เมื่อเครื่องแม่อนุมัติแล้ว หน้านี้จะเปลี่ยนเป็นโหมดเครื่องลูกอัตโนมัติ</div>
          </div>
        </div>
      </section>

      <section id="screen-client-main" class="hidden">
        <section id="screen-client-units" class="screen-client p-4">
          <div class="flex items-center justify-between gap-3 mb-4">
            <div>
              <div id="unit-type-title" class="text-lg font-black text-gray-800">โต๊ะ/คิว</div>
              <div class="text-xs font-bold text-gray-400">กดเลือกก่อนรับออร์เดอร์</div>
            </div>
            <div class="bg-white rounded-2xl border p-1 flex items-center gap-1 shadow-sm">
              <button onclick="changeClientGridZoom(-1)" class="w-10 h-10 rounded-xl bg-gray-50 text-xl font-black">-</button>
              <div id="client-zoom-level" class="w-10 text-center font-black text-sm">M</div>
              <button onclick="changeClientGridZoom(1)" class="w-10 h-10 rounded-xl bg-gray-50 text-xl font-black">+</button>
            </div>
          </div>

          <div id="client-grid-units" class="grid grid-cols-2 gap-3"></div>

          <div class="mt-4 bg-white rounded-[24px] border shadow-sm p-4">
            <div class="flex items-center justify-between gap-2">
              <div>
                <div id="active-unit-label" class="text-lg font-black text-gray-800">ยังไม่ได้เลือกโต๊ะ/คิว</div>
                <div id="active-unit-time" class="text-xs font-bold text-gray-400">เลือกก่อนเพื่อเริ่มรับออร์เดอร์</div>
              </div>
              <button onclick="openCartSheet()" class="px-4 py-2 rounded-2xl theme-bg text-white font-black">ตะกร้า</button>
            </div>

            <div id="client-menu-list" class="mt-4 grid grid-cols-2 gap-3"></div>
          </div>
        </section>

        <section id="screen-client-bill" class="screen-client hidden p-4">
          <div class="bg-white rounded-[24px] border shadow-sm p-4">
            <div class="text-lg font-black text-gray-800">ขอเช็คบิล</div>
            <div class="text-xs font-bold text-gray-400 mt-1">เครื่องลูกทำได้แค่ขอเช็คบิล ปิดบิลจริงให้เครื่องแม่เท่านั้น</div>

            <div id="bill-unit-list" class="mt-4 space-y-3"></div>
          </div>
        </section>

        <section id="screen-client-settings" class="screen-client hidden p-4">
          <div class="bg-white rounded-[24px] border shadow-sm p-4 space-y-4">
            <div>
              <div class="text-lg font-black text-gray-800">โปรไฟล์เครื่องลูก</div>
              <div class="text-xs font-bold text-gray-400 mt-1">ชื่อและรูปนี้จะส่งให้เครื่องแม่เห็นตอนออนไลน์</div>
            </div>

            <div class="flex items-center gap-4">
              <div class="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border flex items-center justify-center shrink-0">
                <img id="client-avatar-preview" src="" class="w-full h-full object-cover hidden">
                <span id="client-avatar-preview-fallback" class="font-black text-gray-500 text-xl">C</span>
              </div>
              <div class="flex-1">
                <input id="client-name-input" type="text" placeholder="ชื่อเครื่องลูก" class="w-full rounded-2xl border px-4 py-3 font-bold outline-none">
                <label class="mt-3 inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 font-black cursor-pointer">
                  <span>อัปโหลดรูป</span>
                  <input id="client-avatar-input" type="file" accept="image/*" class="hidden" onchange="handleClientAvatar(event)">
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <button onclick="saveClientProfile()" class="py-3 rounded-2xl theme-bg text-white font-black">บันทึกโปรไฟล์</button>
              <button onclick="submitJoinRequest(true)" class="py-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 font-black">ส่งคำขอเชื่อมใหม่</button>
              <button onclick="forceFlushQueue()" class="py-3 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 font-black">ส่งคิวค้างอีกครั้ง</button>
              <button onclick="clientLogout()" class="py-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-black">Logout เครื่องลูก</button>
            </div>

            <div class="rounded-2xl bg-gray-50 border p-4 text-xs font-bold text-gray-600 space-y-2">
              <div>Shop ID: <span id="client-shop-id-view" class="font-black text-gray-800">-</span></div>
              <div>Client ID: <span id="client-id-view" class="font-black text-gray-800 break-all">-</span></div>
              <div>สถานะ: <span id="client-setting-status" class="font-black text-gray-800">-</span></div>
              <div>คิวค้างส่ง: <span id="client-pending-queue-view" class="font-black text-gray-800">0</span></div>
              <div>ซิงก์ล่าสุด: <span id="client-last-sync-view" class="font-black text-gray-800">-</span></div>
            </div>
          </div>
        </section>
      </section>
    </main>
  </div>

  <div id="cart-sheet" class="sheet">
    <div class="sheet-panel p-4 pb-28">
      <div class="flex items-center justify-between gap-2">
        <div>
          <div id="cart-sheet-title" class="text-lg font-black text-gray-800">ตะกร้า</div>
          <div class="text-xs font-bold text-gray-400">ส่งออร์เดอร์เข้าเครื่องแม่</div>
        </div>
        <button onclick="closeCartSheet()" class="w-10 h-10 rounded-xl bg-gray-100 text-xl font-black">×</button>
      </div>

      <div id="cart-sheet-list" class="mt-4 space-y-3"></div>

      <div class="mt-4 rounded-2xl bg-gray-50 border p-4 flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-bold text-gray-400">รวมทั้งหมด</div>
          <div class="text-2xl font-black theme-text">฿<span id="cart-sheet-total">0</span></div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button onclick="clearActiveDraft()" class="px-4 py-3 rounded-2xl bg-gray-100 text-gray-700 font-black">ล้าง</button>
          <button onclick="sendActiveOrder()" class="px-5 py-3 rounded-2xl theme-bg text-white font-black fab-shadow">ส่งออร์เดอร์</button>
        </div>
      </div>
    </div>
  </div>

  <div id="modal-addon" class="modal">
    <div class="bg-white rounded-[28px] shadow-2xl p-5 w-full max-w-md">
      <div class="flex items-center justify-between gap-2">
        <div>
          <div id="addon-item-title" class="text-lg font-black text-gray-800">เลือกเพิ่มเติม</div>
          <div class="text-xs font-bold text-gray-400">เลือกแล้วค่อยเพิ่มลงตะกร้า</div>
        </div>
        <button onclick="closeAddonModal()" class="w-10 h-10 rounded-xl bg-gray-100 text-xl font-black">×</button>
      </div>
      <div id="addon-list" class="mt-4 space-y-2"></div>
      <div class="mt-4 grid grid-cols-2 gap-3">
        <button onclick="closeAddonModal()" class="py-3 rounded-2xl bg-gray-100 font-black">ยกเลิก</button>
        <button onclick="confirmAddonSelection()" class="py-3 rounded-2xl theme-bg text-white font-black">เพิ่มลงตะกร้า</button>
      </div>
    </div>
  </div>

  <div id="modal-client-scanner" class="modal">
    <div class="bg-white rounded-[28px] shadow-2xl p-5 w-full max-w-md">
      <div class="flex items-center justify-between gap-2">
        <div>
          <div class="text-lg font-black text-gray-800">สแกน QR เครื่องแม่</div>
          <div class="text-xs font-bold text-gray-400">สแกนแล้วจะกรอก PIN ให้เอง</div>
        </div>
        <button onclick="closeClientScanner()" class="w-10 h-10 rounded-xl bg-gray-100 text-xl font-black">×</button>
      </div>
      <div id="qr-reader-client" class="mt-4 overflow-hidden rounded-2xl border"></div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script src="js/db.js"></script>
  <script src="js/core-client.js"></script>
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  </script>
</body>
</html>
