// sw.js - Service Worker (FAKDU v9.42 PRO)

const CACHE_NAME = 'fakdu-cache-v9.43';

// 📦 รายการไฟล์ที่ต้องสูบมาเก็บไว้ในเครื่อง (Offline 100%)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './client.html',
    './style.css',
    './manifest.json',
    './js/core.js',
    './js/vault.js',
    './js/client-core.js'
'./js/tailwind.js'
    // 💡 ถ้าเฮียโหลดไฟล์ Tailwind หรือ QRCode มาไว้ในเครื่องแล้ว ให้เอาชื่อไฟล์มาใส่เพิ่มตรงนี้นะครับ เช่น
    // './lib/tailwind.min.js',
    './lib/qrcode.min.js',
    './icon.png'
];

// ==========================================
// 1. INSTALL - โหลดเสบียงเข้าเครื่อง (ทำงานครั้งแรก)
// ==========================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching offline assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // บังคับให้ Service Worker ตัวใหม่ทำงานทันที ไม่ต้องรอปิดเบราว์เซอร์
    self.skipWaiting();
});

// ==========================================
// 2. ACTIVATE - เคลียร์ขยะเก่า (เมื่ออัปเดตเวอร์ชั่น)
// ==========================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    // ถ้าชื่อ Cache ไม่ตรงกับเวอร์ชั่นปัจจุบัน ให้ลบทิ้งไปเลย
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    // เข้าควบคุมหน้าเว็บทั้งหมดทันที
    self.clients.claim();
});

// ==========================================
// 3. FETCH - ยามเฝ้าประตู (ตอนเน็ตตัด/เน็ตมา)
// ==========================================
self.addEventListener('fetch', (event) => {
    // ข้ามการแคชข้อมูลที่ส่งผ่าน API (เช่น Firebase หรือระบบภายนอก)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // กลยุทธ์: Stale-While-Revalidate
            // 1. ถ้ามีของในแคช ให้ส่งของในแคชไปให้หน้าเว็บแสดงผลทันที (แอปจะเปิดไวมากและทำงานตอนออฟไลน์ได้)
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // 2. แอบไปโหลดข้อมูลใหม่จากเน็ตมาเซฟทับแคชเดิม (เตรียมไว้ใช้รอบหน้า)
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            }).catch(() => {
                // ถ้าเน็ตตัดจริงๆ ก็ไม่ต้องทำอะไร ปล่อยให้ใช้ของในแคชต่อไป
                console.log('[SW] Offline mode, using cache for:', event.request.url);
            });

            // คืนค่าของในแคช (ถ้ามี) หรือรอของจากเน็ต (ถ้าแคชว่าง)
            return cachedResponse || fetchPromise;
        })
    );
});