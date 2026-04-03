/* ============================================================
   SIGMA RESEARCH PLATFORM — script.js
   Phase 3 (MVP) + Phase 4 (A/B dynamic config) +
   Phase 5 (Leaderboard UI, Badge system, Mini Games)
   ============================================================ */

'use strict';

// ============================================================
//   CONFIG — Thay URL này sau khi deploy Apps Script
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbzwvvzvkdjiNyE_Bb05A-UExtYyEF2dD1YPUkkyEfM4YVQi3ypRJqaqLnvUoPfS90y8/exec';
const API_TOKEN = 'Sigma2025';

// ============================================================
//   STATE
// ============================================================
let userId      = '';
let userVariant = 'A';
let localScore  = 0;
let sessionPlays = 0;
let sysConfig   = {};
let timedActive = false;
let timedTimer  = null;
let timedClicks = 0;
let timedSecondsLeft = 30;
let allAchievements = [];   // dữ liệu từ config (nếu có)

// Predefined achievements (fallback nếu không kéo được từ backend)
const ACHIEVEMENTS_FALLBACK = [
  { id: 'first_click',  name: 'Newbie',       description: 'Lần đầu chơi game',   threshold: 1,     icon: '🎮' },
  { id: 'rising_star',  name: 'Rising Star',   description: 'Đạt 500 điểm',        threshold: 500,   icon: '⭐' },
  { id: 'master_gamer', name: 'Master Gamer',  description: 'Đạt 1000 điểm',       threshold: 1000,  icon: '🏆' },
  { id: 'legend',       name: 'Legend',        description: 'Đạt 5000 điểm',       threshold: 5000,  icon: '👑' },
  { id: 'eternal',      name: 'Eternal',       description: 'Đạt 10000 điểm',      threshold: 10000, icon: '💎' },
];

// ============================================================
//   SIGMA CACHE
// ============================================================
class SigmaCache {
    constructor(ttl = 60000) { this.ttl = ttl; }
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
        localStorage.setItem(`sigma_cache_${key}`, JSON.stringify({ value, timestamp: Date.now() }));
    }
}
const cache = new SigmaCache();

// ============================================================
//   INIT
// ============================================================
async function init() {
  if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
          .then(() => console.log('SW Registered'))
          .catch(err => console.error('SW Error:', err));
  }

  // 1. Lấy hoặc tạo user ID
  userId = localStorage.getItem('sigma_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sigma_user_id', userId);
  }

  // Restore local score from storage
  localScore = parseInt(localStorage.getItem('sigma_score') || '0');
  sessionPlays = parseInt(sessionStorage.getItem('sigma_plays') || '0');

  updateScoreDisplay(false);
  setElement('display-user-id', truncate(userId, 14));

  // 2. Fetch toàn bộ data qua InitialData batch
  await loadInitialData();

  hideLoading();
  
  // Prefetch leaderboard (Chạy ngầm không đợi)
  setTimeout(() => loadLeaderboard(), 100);

  // 5. Leaderboard auto-refresh mỗi 30 giây
  setInterval(() => {
    if (document.getElementById('leaderboard-tab').classList.contains('active')) {
      loadLeaderboard();
    }
  }, 30000);
}

// ============================================================
//   API HELPERS
// ============================================================
function buildGetUrl(params) {
  const p = new URLSearchParams({ token: API_TOKEN, ...params });
  return `${API_URL}?${p.toString()}`;
}

async function apiGet(params) {
  const resp = await fetch(buildGetUrl(params));
  return resp.json();
}

async function apiPost(body) {
  // Note: no-cors khi gọi từ GitHub Pages (response body không đọc được)
  // Dùng cors nếu deploy App Script với headers CORS (hoặc dùng jsonp trick)
  return fetch(API_URL, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token: API_TOKEN, ...body }),
  }).then(() => ({ status: 'optimistic' }))
    .catch(() => ({ status: 'error' }));
}

// ============================================================
//   FETCH INITIAL DATA (Phase 5: Batch API & Caching)
// ============================================================
async function loadInitialData() {
  try {
    const cacheData = cache.get('initialDataMain');
    if (cacheData) {
      applyInitialData(cacheData);
      return;
    }

    const data = await apiGet({ action: 'getInitialData', user_id: userId });
    if(data.status === 'success') {
      cache.set('initialDataMain', data);
      applyInitialData(data);
    } else {
      throw new Error('API return error');
    }
  } catch (e) {
    console.error('Lỗi load initial data:', e);
    // Fallback
    userVariant = localStorage.getItem('sigma_variant') || 'A';
    applyVariantStyle();
  }
}

function applyInitialData(data) {
  sysConfig = data.config || {};
  userVariant = data.userGroup || 'A';
  localStorage.setItem('sigma_variant', userVariant);
  
  applyDynamicConfig();
  applyVariantStyle();
  
  showToast(`🎯 Nhóm của bạn: ${userVariant}`, 'info');
}

function applyDynamicConfig() {
  // Áp dụng màu button theo variant (sẽ gọi lại sau khi biết variant)
}

function applyVariantStyle() {
  const colorA = sysConfig.button_color_A || '#6366f1';
  const colorB = sysConfig.button_color_B || '#f59e0b';
  const color  = userVariant === 'B' ? colorB : colorA;
  document.documentElement.style.setProperty('--c-group', color);

  const badge = document.getElementById('variant-badge');
  if (badge) {
    badge.textContent = `Nhóm ${userVariant}`;
    badge.style.background = color;
  }

  const groupTag = document.getElementById('group-tag');
  if (groupTag) {
    groupTag.textContent = `Nhóm: ${userVariant}`;
    groupTag.style.color  = color;
    groupTag.style.borderColor = color + '66';
    groupTag.style.background  = color + '22';
  }

  // Cập nhật hint reward trên click button
  const clickRewardHint = document.getElementById('click-reward-hint');
  if (clickRewardHint) {
    const baseClick = userVariant === 'B' ? 20 : 10;
    clickRewardHint.textContent = `+${baseClick} điểm`;
  }
}

// ============================================================
//   SCORE MANAGEMENT
// ============================================================
function addScore(delta, actionName) {
  localScore += delta;
  sessionPlays++;
  localStorage.setItem('sigma_score', String(localScore));
  sessionStorage.setItem('sigma_plays', String(sessionPlays));
  updateScoreDisplay(true);
  updateSessionPlays();
  checkLocalMilestones(localScore - delta, localScore);

  // Fire & forget POST
  apiPost({
    action:      'updateScore',
    user_id:     userId,
    score_delta: delta,
    metadata:    JSON.stringify({ source: actionName, variant: userVariant }),
  }).then(resp => {
    if (resp && resp.badges && resp.badges.length > 0) {
      resp.badges.forEach(b => showBadgePopup(b));
    }
    if (resp && resp.reward) {
      showMilestonePopup(resp.reward.message || '🎉 Milestone!', resp.reward.threshold);
    }
  }).catch(() => {});
}

function updateScoreDisplay(animate) {
  const el = document.getElementById('score');
  if (!el) return;
  el.textContent = localScore.toLocaleString('vi-VN');
  if (animate) {
    const wrap = document.getElementById('score-display');
    wrap.classList.add('bump');
    setTimeout(() => wrap.classList.remove('bump'), 150);
  }
}

function updateSessionPlays() {
  const el = document.getElementById('session-plays');
  if (el) el.textContent = `${sessionPlays} lượt chơi hôm nay`;
}

function checkLocalMilestones(oldScore, newScore) {
  const milestones = [500, 1000, 5000, 10000];
  for (const m of milestones) {
    if (newScore >= m && oldScore < m) {
      showMilestonePopup(`🎉 Chúc mừng! Bạn đã đạt ${m.toLocaleString()} điểm!`, m);
      break;
    }
  }
}

// ============================================================
//   MINI GAME 1: Click Challenge
// ============================================================
document.getElementById('clickBtn').addEventListener('click', () => {
  const delta = userVariant === 'B' ? 20 : 10;
  addScore(delta, 'click_button');
  showToast(`+${delta} điểm! 🔘`, 'success');
});

// ============================================================
//   MINI GAME 2: Spin Wheel
// ============================================================
document.getElementById('spinBtn').addEventListener('click', () => {
  const spinBtn   = document.getElementById('spinBtn');
  const wheelVisual = document.getElementById('wheel-visual');
  spinBtn.disabled = true;
  spinBtn.textContent = '🌀 Đang quay…';
  wheelVisual.classList.add('spinning');

  setTimeout(() => {
    let reward = 0;
    if (userVariant === 'A') {
      reward = Math.floor(Math.random() * (parseInt(sysConfig.reward_daily_spin_A) || 100)) + 10;
    } else if (userVariant === 'B') {
      reward = Math.floor(Math.random() * (parseInt(sysConfig.reward_daily_spin_B) || 200)) + 20;
    } else {
      reward = Math.floor(Math.random() * 50) + 5;
    }

    addScore(reward, 'spin_wheel');
    showToast(`🎡 Bạn quay được +${reward} điểm!`, 'success');
    wheelVisual.classList.remove('spinning');
    spinBtn.disabled  = false;
    spinBtn.innerHTML = '<span class="btn-label">Quay ngay!</span>';

    // Cooldown 3 giây
    spinBtn.disabled = true;
    setTimeout(() => { spinBtn.disabled = false; }, 3000);
  }, 900);
});

// ============================================================
//   MINI GAME 3: Timed Click Challenge
// ============================================================
document.getElementById('timedBtn').addEventListener('click', () => {
  if (timedActive) {
    // Click trong lúc đang chơi → đếm click
    timedClicks++;
    document.getElementById('timed-clicks').textContent = timedClicks;
    return;
  }

  // Bắt đầu
  timedActive      = true;
  timedClicks      = 0;
  timedSecondsLeft = 30;
  document.getElementById('timed-clicks').textContent = '0';
  document.getElementById('timed-timer').textContent  = '30';

  const btn = document.getElementById('timedBtn');
  btn.innerHTML = '⚡ Click! Click! Click!';
  btn.classList.remove('btn-accent');
  btn.classList.add('btn-primary', 'pulse');

  timedTimer = setInterval(() => {
    timedSecondsLeft--;
    document.getElementById('timed-timer').textContent = timedSecondsLeft;

    // Màu đỏ khi sắp hết
    if (timedSecondsLeft <= 5) {
      document.getElementById('timed-timer').style.color = '#ef4444';
    }

    if (timedSecondsLeft <= 0) {
      clearInterval(timedTimer);
      timedActive = false;
      finishTimedGame();
    }
  }, 1000);
});

function finishTimedGame() {
  const multiplier = userVariant === 'B' ? 3 : 2;
  const points     = timedClicks * multiplier;

  document.getElementById('timed-timer').textContent = '✅';
  document.getElementById('timed-timer').style.color = '';

  const btn = document.getElementById('timedBtn');
  btn.classList.remove('btn-primary', 'pulse');
  btn.classList.add('btn-accent');
  btn.innerHTML = '🚀 Bắt đầu';

  if (points > 0) {
    addScore(points, 'timed_click');
    showToast(`⏱️ ${timedClicks} click × ${multiplier} = +${points} điểm!`, 'success');
  } else {
    showToast('⏱️ Không có lần click nào!', 'info');
  }
}

// ============================================================
//   LEADERBOARD
// ============================================================
async function loadLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  try {
    const data = await apiGet({ action: 'getLeaderboard', limit: 10, user_id: userId });
    if (data.status !== 'success' || !data.data.length) {
      list.innerHTML = '<p class="lb-empty">Chưa có dữ liệu.</p>';
      return;
    }

    const rankEmojis = ['🥇', '🥈', '🥉'];
    list.innerHTML = data.data.map((entry, i) => {
      const rankLabel  = i < 3 ? rankEmojis[i] : `#${entry.rank}`;
      const isCurrent  = entry.user_id === userId;
      const rankClass  = i < 3 ? `rank-${i+1}` : '';
      return `
        <div class="lb-row ${rankClass} ${isCurrent ? 'current-user' : ''}">
          <span class="lb-rank">${rankLabel}</span>
          <span class="lb-user">${truncate(entry.user_id, 16)}${isCurrent ? ' 👈' : ''}</span>
          <span class="lb-variant ${entry.variant}">${entry.variant}</span>
          <span class="lb-score">${Number(entry.total_score).toLocaleString('vi-VN')}</span>
        </div>
      `;
    }).join('');
  } catch (_) {
    list.innerHTML = '<p class="lb-empty">Không thể tải bảng xếp hạng.</p>';
  }
}

document.getElementById('refreshLbBtn').addEventListener('click', loadLeaderboard);

// ============================================================
//   BADGES / ACHIEVEMENTS
// ============================================================
async function loadBadges() {
  const earned  = document.getElementById('badges-list');
  const allList = document.getElementById('all-achievements-list');

  try {
    const data = await apiGet({ action: 'getAchievements', user_id: userId });
    const earnedIds = new Set();

    if (data.status === 'success' && data.data.length > 0) {
      earnedIds.clear();
      data.data.forEach(b => earnedIds.add(b.id || b.achievement_id));
      earned.innerHTML = data.data.map(b => `
        <div class="badge-item earned">
          <div class="badge-icon">${b.icon || '⭐'}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.description || ''}</div>
        </div>
      `).join('');
    } else {
      earned.innerHTML = '<p class="lb-empty">Chưa đạt thành tựu nào. Hãy tiếp tục chơi!</p>';
    }

    // Hiển thị danh sách tất cả achievements (fallback)
    allList.innerHTML = ACHIEVEMENTS_FALLBACK.map(a => {
      const isEarned = earnedIds.has(a.id) || localScore >= a.threshold;
      return `
        <div class="badge-item ${isEarned ? 'earned' : 'locked'}">
          <div class="badge-icon">${a.icon}</div>
          <div class="badge-name">${a.name}</div>
          <div class="badge-desc">${a.description}</div>
          ${!isEarned ? `<div class="badge-desc" style="margin-top:4px;color:#6366f1">Cần ${a.threshold.toLocaleString()} điểm</div>` : ''}
        </div>
      `;
    }).join('');

  } catch (_) {
    earned.innerHTML = '<p class="lb-empty">Không thể tải thành tựu.</p>';
  }
}

function showBadgePopup(badge) {
  showMilestonePopup(`${badge.icon || '🏅'} ${badge.name}\n${badge.description}`, null);
}

// ============================================================
//   MILESTONE POPUP
// ============================================================
function showMilestonePopup(message, threshold) {
  const popup = document.getElementById('milestone-popup');
  document.getElementById('milestone-icon').textContent = threshold ? '🎉' : '🏅';
  document.getElementById('milestone-title').textContent = threshold ? `Mốc ${Number(threshold).toLocaleString()}!` : 'Thành tựu mới!';
  document.getElementById('milestone-msg').textContent  = message;
  popup.classList.remove('hidden');
}

document.getElementById('milestone-close').addEventListener('click', () => {
  document.getElementById('milestone-popup').classList.add('hidden');
});

// ============================================================
//   TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3000);
}

// ============================================================
//   TAB NAVIGATION
// ============================================================
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // Lazy-load tab data
    if (tabId === 'leaderboard-tab') loadLeaderboard();
    if (tabId === 'badges-tab')      loadBadges();
  });
});

// ============================================================
//   UTILITIES
// ============================================================
function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '…' : str;
}

function setElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('hidden');
}

// ============================================================
//   BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', init);
