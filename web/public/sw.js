// 최소 서비스워커: 설치형(PWA) 조건만 충족. 캐시하지 않으므로 배포 즉시 최신이 반영됨.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// fetch 리스너 존재만으로 설치 가능 조건 충족. respondWith 하지 않아 항상 네트워크(캐시 안 함).
self.addEventListener('fetch', () => {});
