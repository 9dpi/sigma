// ============================================================
//   SIGMA LIVEOPS PLATFORM — Google Apps Script Backend
//   Version: 1.1
//   Repo: https://github.com/9dpi/sigma
// ============================================================

// ========== CẤU HÌNH ==========
const SHEET_USERS       = 'users';
const SHEET_LOG         = 'game_log';
const SHEET_CONFIG      = 'config';
const SHEET_RATE_LIMIT  = 'rate_limit';
const SHEET_ACHIEV      = 'achievements';
const SHEET_USER_ACHIEV = 'user_achievements';
const SHEET_ERROR_LOG   = 'error_log';
const SHEET_GAMES       = 'games';
const SHEET_GAME_STATS  = 'game_stats';

// Security token — đổi secret này trước khi deploy production
const API_SECRET_TOKEN  = 'Sigma2025';
// Rate limit: tối đa bao nhiêu request mỗi user mỗi phút
const RATE_LIMIT_MAX    = 30;
const RATE_LIMIT_WINDOW = 60; // giây

// ============================================================
//   ENTRY POINTS
// ============================================================

/**
 * Hàm khởi tạo hệ thống: Tạo 9 sheets và dữ liệu mẫu.
 * Chạy hàm này một lần duy nhất sau khi tạo dự án Apps Script.
 */
function setupProject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetsToCreate = [
    { name: SHEET_USERS, headers: ['user_id', 'variant', 'total_score', 'last_play', 'created_at'] },
    { name: SHEET_LOG, headers: ['timestamp', 'user_id', 'action', 'score_delta', 'metadata', 'game_id'] },
    { name: SHEET_CONFIG, headers: ['key', 'value', 'description', 'active'] },
    { name: SHEET_RATE_LIMIT, headers: ['timestamp', 'user_id', 'request_count'] },
    { name: SHEET_ACHIEV, headers: ['achievement_id', 'name', 'description', 'threshold', 'icon'] },
    { name: SHEET_USER_ACHIEV, headers: ['user_id', 'achievement_id', 'earned_at'] },
    { name: SHEET_ERROR_LOG, headers: ['timestamp', 'endpoint', 'error_message', 'request_data'] },
    { name: SHEET_GAMES, headers: ['game_id', 'game_name', 'description', 'thumbnail_url', 'game_type', 'config_params', 'is_active', 'display_order', 'created_at', 'version'] },
    { name: SHEET_GAME_STATS, headers: ['game_id', 'total_plays', 'avg_score', 'avg_play_time', 'daily_plays', 'last_updated'] }
  ];

  sheetsToCreate.forEach(s => {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.appendRow(s.headers);
      sheet.getRange(1, 1, 1, s.headers.length).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }
  });

  // Khởi tạo dữ liệu mẫu cho config (nếu trống)
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (configSheet.getLastRow() === 1) {
    const sampleConfig = [
      ['ab_test_name', 'new_reward_ui', 'Tên thí nghiệm hiện tại', true],
      ['percent_variant_A', 50, '% người dùng vào nhóm A', true],
      ['percent_variant_B', 50, '% người dùng vào nhóm B', true],
      ['reward_daily_spin_A', 100, 'Phần thưởng vòng quay nhóm A', true],
      ['reward_daily_spin_B', 200, 'Phần thưởng vòng quay nhóm B', true],
      ['button_color_A', '#6366f1', 'Màu nút nhóm A', true],
      ['button_color_B', '#f59e0b', 'Màu nút nhóm B', true]
    ];
    sampleConfig.forEach(row => configSheet.appendRow(row));
  }

  // Khởi tạo dữ liệu mẫu cho achievements (nếu trống)
  const achievSheet = ss.getSheetByName(SHEET_ACHIEV);
  if (achievSheet.getLastRow() === 1) {
    const sampleAchiev = [
      ['first_click', 'Newbie', 'Lần đầu chơi game', 1, '🎮'],
      ['rising_star', 'Rising Star', 'Đạt 500 điểm', 500, '⭐'],
      ['master_gamer', 'Master Gamer', 'Đạt 1000 điểm', 1000, '🏆'],
      ['legend', 'Legend', 'Đạt 5000 điểm', 5000, '👑'],
      ['eternal', 'Eternal', 'Đạt 10000 điểm', 10000, '💎']
    ];
    sampleAchiev.forEach(row => achievSheet.appendRow(row));
  }

  // Khởi tạo dữ liệu mẫu cho Games (nếu trống)
  const gamesSheet = ss.getSheetByName(SHEET_GAMES);
  if (gamesSheet.getLastRow() === 1) {
    const sampleGames = [
      ['click_challenge_v1', 'Click Challenge', 'Mỗi lần click là có điểm. Càng click nhanh càng được nhiều!', 'https://placehold.co/100x100/6366f1/FFF?text=Click', 'click', '{"base_point":10,"multiplier_B":2}', true, 1, new Date(), '1.0.0'],
      ['spin_wheel_v1', 'Vòng quay may mắn', 'Quay hằng ngày để nhận phần thưởng ngẫu nhiên', 'https://placehold.co/100x100/f59e0b/FFF?text=Spin', 'spin', '{"max_reward": 200}', true, 2, new Date(), '1.0.0'],
      ['timed_click_v1', 'Timed Click (30s)', 'Thử thách click trong 30 giây để nhận hệ số nhân ấn tượng', 'https://placehold.co/100x100/10b981/FFF?text=Timer', 'timer', '{"duration": 30}', true, 3, new Date(), '1.0.0']
    ];
    sampleGames.forEach(row => gamesSheet.appendRow(row));
  }

  Logger.log('Hệ thống Sigma đã được thiết lập thành công!');
}

function doGet(e) {
  try {
    // Để dễ test trên browser mà không cần truyền token:
    const token = e.parameter.token || 'Sigma2025'; // Fallback nếu bỏ trống cho GET calls tự do

    const userId = e.parameter.user_id || 'anonymous';
    // Disable rate limit cho GET request dashboard/admin action (tạm thời)
    // if (!checkRateLimit(userId)) { return jsonResponse({ status: 'error', message: 'Rate limit exceeded' }); }

    const action = e.parameter.action;

    if (action === 'getUserGroup') {
      const group = getUserGroup(userId);
      return jsonResponse({ status: 'success', variant: group });
    }

    if (action === 'getLeaderboard') {
      const limit = parseInt(e.parameter.limit) || 10;
      return jsonResponse({ status: 'success', data: getLeaderboard(limit) });
    }

    if (action === 'getConfig') {
      return jsonResponse({ status: 'success', data: getAllConfig() });
    }

    if (action === 'getAchievements') {
      return jsonResponse({ status: 'success', data: getUserAchievements(userId) });
    }

    // --- MỚI TRONG V1.1 ---
    if (action === 'getGames') {
      return jsonResponse(getGames());
    }

    if (action === 'getStats') {
      return jsonResponse(getStats());
    }

    if (action === 'getABResults') {
      return jsonResponse(getABResults());
    }

    if (action === 'getUserScore') {
      return jsonResponse({ status: 'success', score: getUserScoreVal(userId) });
    }

    return jsonResponse({ status: 'error', message: 'Invalid action' });

  } catch (err) {
    logError('doGet', err.message, JSON.stringify(e.parameter));
    return jsonResponse({ status: 'error', message: 'Internal server error' });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const userId = data.user_id || 'anonymous';

    const action = data.action;

    if (action === 'updateScore') {
      const result = updateUserScore(userId, data.score_delta, data.metadata || '', data.game_id || '');
      return jsonResponse(result);
    }

    if (action === 'logEvent') {
      logEvent(userId, data.event_name, data.metadata || '', data.game_id || '');
      return jsonResponse({ status: 'success' });
    }

    // --- MỚI TRONG V1.1 ---
    if (action === 'addGame') {
      return jsonResponse(addGame(data));
    }
    
    if (action === 'toggleGame') {
      return jsonResponse(toggleGame(data.game_id, data.is_active));
    }

    if (action === 'deleteGame') {
      return jsonResponse(deleteGame(data.game_id));
    }

    if (action === 'saveABTest') {
      return jsonResponse(saveABTest(data));
    }

    return jsonResponse({ status: 'error', message: 'Invalid action' });

  } catch (err) {
    logError('doPost', err.message, e.postData ? e.postData.contents : '');
    return jsonResponse({ status: 'error', message: 'Internal server error' });
  }
}


// ============================================================
//   CORE LOGIC
// ============================================================

function getUserGroup(userId) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);

  const userRows = userSheet.getDataRange().getValues();
  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === userId) {
      return userRows[i][1];
    }
  }

  const percentA = getConfigValue('percent_variant_A', 50);
  const percentB = getConfigValue('percent_variant_B', 50);
  const rand = Math.random() * 100;
  let variant = 'A';
  if (rand < percentA)                variant = 'A';
  else if (rand < percentA + percentB) variant = 'B';
  else                                 variant = 'control';

  userSheet.appendRow([userId, variant, 0, new Date(), new Date()]);
  return variant;
}


function updateUserScore(userId, scoreDelta, metadata, gameId) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const logSheet  = ss.getSheetByName(SHEET_LOG);

  const userRows = userSheet.getDataRange().getValues();
  let rowIndex   = -1;

  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === userId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { status: 'error', message: 'User not found' };
  }

  const currentScore = userRows[rowIndex - 1][2];
  const newScore     = currentScore + scoreDelta;

  userSheet.getRange(rowIndex, 3).setValue(newScore);
  userSheet.getRange(rowIndex, 4).setValue(new Date());

  // Ghi log
  logSheet.appendRow([new Date(), userId, 'update_score', scoreDelta, metadata, gameId]);

  // Cập nhật game stats
  if (gameId) updateGameStats(gameId, scoreDelta);

  let milestoneReward = null;
  const milestones = [500, 1000, 5000, 10000];
  for (const m of milestones) {
    if (newScore >= m && currentScore < m) {
      milestoneReward = { type: 'milestone', threshold: m, message: `🎉 Đạt ${m} điểm!` };
      break;
    }
  }

  const newBadges = checkAchievements(userId, newScore, userRows[rowIndex - 1][1]);
  return { status: 'success', new_score: newScore, reward: milestoneReward, badges: newBadges };
}

function getUserScoreVal(userId) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const userRows = userSheet.getDataRange().getValues();
  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === userId) return userRows[i][2];
  }
  return 0;
}

function logEvent(userId, eventName, metadata, gameId) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_LOG);
  logSheet.appendRow([new Date(), userId, eventName, 0, metadata, gameId]);
}


function getLeaderboard(limit = 10) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const userRows  = userSheet.getDataRange().getValues();

  const users = userRows.slice(1);
  users.sort((a, b) => b[2] - a[2]);

  return users.slice(0, limit).map((user, idx) => ({
    rank:        idx + 1,
    user_id:     user[0],
    variant:     user[1],
    total_score: user[2]
  }));
}

function getAllConfig() {
  const cache     = CacheService.getScriptCache();
  const cached    = cache.get('sigma_config');
  if (cached) return JSON.parse(cached);

  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  const rows        = configSheet.getDataRange().getValues();
  const config      = {};

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3] === true) {
      config[rows[i][0]] = rows[i][1];
    }
  }

  cache.put('sigma_config', JSON.stringify(config), 60);
  return config;
}

function getConfigValue(key, defaultValue) {
  const config = getAllConfig();
  return (config[key] !== undefined) ? config[key] : defaultValue;
}


// ============================================================
//   MỚI: GAMES & ADMIN LOGIC (V1.1)
// ============================================================

function getGames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const gamesSheet = ss.getSheetByName(SHEET_GAMES);
  if (!gamesSheet) return [];
  const rows = gamesSheet.getDataRange().getValues();
  const games = [];
  for (let i = 1; i < rows.length; i++) {
    games.push({
      game_id: rows[i][0],
      game_name: rows[i][1],
      description: rows[i][2],
      thumbnail_url: rows[i][3],
      game_type: rows[i][4],
      config_params: rows[i][5],
      is_active: rows[i][6],
      display_order: rows[i][7]
    });
  }
  games.sort((a,b) => a.display_order - b.display_order);
  return games;
}

function addGame(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const gamesSheet = ss.getSheetByName(SHEET_GAMES);
  gamesSheet.appendRow([
    data.game_id, data.game_name, data.description, data.thumbnail_url, 
    data.game_type, data.config_params, true, data.display_order || 99, 
    new Date(), '1.0.0'
  ]);
  return { status: 'success' };
}

function toggleGame(gameId, isActive) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const gamesSheet = ss.getSheetByName(SHEET_GAMES);
  const rows = gamesSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === gameId) {
      gamesSheet.getRange(i + 1, 7).setValue(isActive);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Not found' };
}

function deleteGame(gameId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const gamesSheet = ss.getSheetByName(SHEET_GAMES);
  const rows = gamesSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === gameId) {
      gamesSheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error' };
}

function getStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const users = ss.getSheetByName(SHEET_USERS).getLastRow() - 1;
  const logs = ss.getSheetByName(SHEET_LOG).getLastRow() - 1;
  
  // Tổng quan top game từ games list (Mock data lấy length tạm do chưa full implementation aggregation)
  let topGameStr = 'Spin Wheel';
  
  const dailyPlays = [20, 35, 40, 60, 50, 85, 110]; // Mock chart data cho gọn 
  
  return {
    totalUsers: users,
    totalPlays: logs,
    avgScore: Math.floor(Math.random() * 500) + 100, // mock
    topGame: topGameStr,
    dailyPlays: dailyPlays,
    topGames: [
        { game_name: 'Spin Wheel', total_plays: 120, avg_score: 55 },
        { game_name: 'Click Challenge', total_plays: 89, avg_score: 110 }
    ]
  };
}

function getABResults() {
  // Mock results return
  return [
    { test_name: 'new_reward_ui', avg_score_A: 1500, plays_A: 120, avg_score_B: 2100, plays_B: 350, winner: 'B' },
    { test_name: 'button_color', avg_score_A: 500, plays_A: 40, avg_score_B: 480, plays_B: 42, winner: 'none' }
  ];
}

function saveABTest(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  
  // Tạm lưu thêm 2 dòng mới cho phần trăm A B
  configSheet.appendRow(['ab_test_name_current', data.test_name, 'Test custom', true]);
  configSheet.appendRow(['percent_A_current', data.percent_A, '% custom', true]);
  configSheet.appendRow(['percent_B_current', data.percent_B, '% custom', true]);
  
  CacheService.getScriptCache().remove('sigma_config'); // clear cache
  return { status: 'success' };
}

function updateGameStats(gameId, scoreDelta) {
    // Chỉ là placeholder update cho sheet game_stats để ghi nhận game_id
    // Logic đầy đủ sẽ cần JSON aggregate
}


// ============================================================
//   ACHIEVEMENT SYSTEM
// ============================================================

function checkAchievements(userId, newScore, variant) {
  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const achievSheet = ss.getSheetByName(SHEET_ACHIEV);
  const uaSheet     = ss.getSheetByName(SHEET_USER_ACHIEV);

  if (!achievSheet || !uaSheet) return [];

  const achievRows = achievSheet.getDataRange().getValues();
  const uaRows     = uaSheet.getDataRange().getValues();

  const earned = new Set();
  for (let i = 1; i < uaRows.length; i++) {
    if (uaRows[i][0] === userId) earned.add(uaRows[i][1]);
  }

  const newBadges = [];
  for (let i = 1; i < achievRows.length; i++) {
    const [achId, name, description, threshold, icon] = achievRows[i];
    if (!earned.has(achId) && newScore >= threshold) {
      uaSheet.appendRow([userId, achId, new Date()]);
      newBadges.push({ id: achId, name, description, icon });
    }
  }
  return newBadges;
}

function getUserAchievements(userId) {
  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const achievSheet = ss.getSheetByName(SHEET_ACHIEV);
  const uaSheet     = ss.getSheetByName(SHEET_USER_ACHIEV);
  if (!achievSheet || !uaSheet) return [];

  const achievRows = achievSheet.getDataRange().getValues();
  const uaRows     = uaSheet.getDataRange().getValues();

  const achievMap = {};
  for (let i = 1; i < achievRows.length; i++) {
    achievMap[achievRows[i][0]] = { name: achievRows[i][1], description: achievRows[i][2], icon: achievRows[i][4] };
  }

  const result = [];
  for (let i = 1; i < uaRows.length; i++) {
    if (uaRows[i][0] === userId) {
      const achId = uaRows[i][1];
      result.push({ ...achievMap[achId], earned_at: uaRows[i][2] });
    }
  }
  return result;
}

// ============================================================
//   SECURITY
// ============================================================
function validateToken(token) { return true; /* Giữ tự do vì hiện tại demo dashboard không lưu token chặt */ }

function checkRateLimit(userId) {
  const cache   = CacheService.getScriptCache();
  const cacheKey = `rate_${userId}`;
  const count   = parseInt(cache.get(cacheKey) || '0');
  if (count >= RATE_LIMIT_MAX) return false;
  cache.put(cacheKey, String(count + 1), RATE_LIMIT_WINDOW);
  return true;
}

// ============================================================
//   UTILITIES
// ============================================================
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function logError(endpoint, errorMessage, requestData) {
  try {
    const ss       = SpreadsheetApp.getActiveSpreadsheet();
    const errSheet = ss.getSheetByName(SHEET_ERROR_LOG);
    if (errSheet) { errSheet.appendRow([new Date(), endpoint, errorMessage, requestData]); }
  } catch (e) { console.error('logError failed:', e.message); }
}

function weeklyBackup() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_LOG);
  const csvData  = sheetToCsv(logSheet);
  const fileName = `sigma_game_log_backup_${Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd')}.csv`;
  const folder   = DriveApp.getFolderById('1UtZIWEgv752AHVq3aFfJ6piVtZ2tmvhL');
  folder.createFile(fileName, csvData, MimeType.PLAIN_TEXT);
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const totalUsers = userSheet.getLastRow() - 1;
  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: `[Sigma] Báo cáo tuần — ${fileName}`,
    body: `Backup hoàn tất.\n\nTổng users: ${totalUsers}\nFile: ${fileName}`
  });
}

function sheetToCsv(sheet) {
  const rows = sheet.getDataRange().getValues();
  return rows.map(row => row.map(cell => { const s = String(cell).replace(/"/g, '""'); return s.includes(',') ? `"${s}"` : s; }).join(',')).join('\n');
}
