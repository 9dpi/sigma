const CACHE_NAME = 'sigma-v1';
const urlsToCache = [
    './',
    './index.html',
    './appstore.html',
    './dashboard.html',
    './style.css',
    './script.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    // Không cache các request API POST hoặc external scripts dynamic nếu cần
    if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request).then(
                  function(response) {
                    if(!response || response.status !== 200 || response.type !== 'basic') {
                      return response;
                    }
                    var responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                      .then(function(cache) {
                        cache.put(event.request, responseToCache);
                      });
                    return response;
                  }
                );
            })
    );
});
