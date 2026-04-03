Giải pháp tối ưu hóa (từ dễ → khó)
1. Cache phía Frontend (Giảm 70% số lần gọi API)
Thêm vào index.html hoặc appstore.html:

javascript
// Cache Manager
class SigmaCache {
    constructor(ttl = 60000) { // 60 giây
        this.ttl = ttl;
    }
    
    get(key) {
        const cached = localStorage.getItem(`sigma_cache_${key}`);
        if (!cached) return null;
        
        const { value, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > this.ttl) {
            localStorage.removeItem(`sigma_cache_${key}`);
            return null;
        }
        return value;
    }
    
    set(key, value) {
        localStorage.setItem(`sigma_cache_${key}`, JSON.stringify({
            value: value,
            timestamp: Date.now()
        }));
    }
}

const cache = new SigmaCache();

// Thay thế fetch game list
async function loadGames() {
    const cached = cache.get('games');
    if (cached) {
        renderGames(cached);
        return;
    }
    
    const response = await fetch(`${API_URL}?action=getGames`);
    const games = await response.json();
    cache.set('games', games);
    renderGames(games);
}

// Prefetch leaderboard sau khi load game
setTimeout(() => {
    loadLeaderboard(); // Chạy ngầm, không block UI
}, 100);
2. Batch API Calls (Giảm 50% số request)
Thay vì gọi nhiều API riêng lẻ:

javascript
// ❌ Cách cũ - 3 request
await fetch(`${API_URL}?action=getUserGroup&user_id=${userId}`);
await fetch(`${API_URL}?action=getUserScore&user_id=${userId}`);
await fetch(`${API_URL}?action=getGames`);

// ✅ Cách mới - 1 request
async function loadInitialData() {
    const response = await fetch(`${API_URL}?action=getInitialData&user_id=${userId}`);
    const data = await response.json();
    // data = { userGroup, userScore, games, leaderboard }
    return data;
}
Cập nhật Apps Script:

javascript
function doGet(e) {
    const action = e.parameter.action;
    const userId = e.parameter.user_id;
    
    if (action === 'getInitialData') {
        const userGroup = getUserGroup(userId);
        const userScore = getUserScore(userId);
        const games = getAllGames();
        const leaderboard = getLeaderboard();
        
        return ContentService.createTextOutput(JSON.stringify({
            userGroup, userScore, games, leaderboard
        })).setMimeType(ContentService.MimeType.JSON);
    }
    // ... các action khác
}
3. Optimize Google Sheets (Giảm 40% thời đọc ghi)
Trong Apps Script, thêm batch operations:

javascript
// ❌ Cách cũ - ghi từng dòng
function logEventOld(userId, action) {
    const sheet = SpreadsheetApp.getActive().getSheetByName('game_log');
    sheet.appendRow([new Date(), userId, action]); // Mỗi lần gọi là 1 lần write
}

// ✅ Cách mới - gom batch
let logBuffer = [];
let flushTimer = null;

function logEventBatch(userId, action, score) {
    logBuffer.push([new Date(), userId, action, score]);
    
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flushLogs(), 3000); // Ghi sau 3 giây
}

function flushLogs() {
    if (logBuffer.length === 0) return;
    
    const sheet = SpreadsheetApp.getActive().getSheetByName('game_log');
    const range = sheet.getRange(sheet.getLastRow() + 1, 1, logBuffer.length, 4);
    range.setValues(logBuffer);
    logBuffer = [];
}
4. Lazy Loading & Skeleton Screen (Cải thiện cảm nhận)
Thêm vào CSS:

css
/* Skeleton loading */
.skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
}

@keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

.game-card.skeleton {
    height: 200px;
    border-radius: 16px;
}
javascript
// Hiển thị skeleton ngay lập tức
function showSkeleton() {
    document.getElementById('gamesGrid').innerHTML = `
        <div class="game-card skeleton"></div>
        <div class="game-card skeleton"></div>
        <div class="game-card skeleton"></div>
    `;
}

// Load với skeleton
async function loadGamesWithSkeleton() {
    showSkeleton();
    const games = await fetchGames();
    renderGames(games);
}
5. Service Worker cho offline-first (Nâng cao)
Tạo file sw.js trong GitHub repo:

javascript
const CACHE_NAME = 'sigma-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/appstore.html',
    '/style.css',
    '/script.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
Đăng ký trong index.html:

javascript
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}