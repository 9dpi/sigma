// ============================================================
//   SIGMA LIVEOPS PLATFORM — Google Apps Script Backend
//   Version: 2.0
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

// Security token — đổi secret này trước khi deploy production
const API_SECRET_TOKEN  = 'Sigma2025';
// Rate limit: tối đa bao nhiêu request mỗi user mỗi phút
const RATE_LIMIT_MAX    = 30;
const RATE_LIMIT_WINDOW = 60; // giây


// ============================================================
//   ENTRY POINTS
// ============================================================

/**
 * Hàm khởi tạo hệ thống: Tạo 7 sheets và dữ liệu mẫu.
 * Chạy hàm này một lần duy nhất sau khi tạo dự án Apps Script.
 */
function setupProject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetsToCreate = [
    { name: SHEET_USERS, headers: ['user_id', 'variant', 'total_score', 'last_play', 'created_at'] },
    { name: SHEET_LOG, headers: ['timestamp', 'user_id', 'action', 'score_delta', 'metadata'] },
    { name: SHEET_CONFIG, headers: ['key', 'value', 'description', 'active'] },
    { name: SHEET_RATE_LIMIT, headers: ['timestamp', 'user_id', 'request_count'] },
    { name: SHEET_ACHIEV, headers: ['achievement_id', 'name', 'description', 'threshold', 'icon'] },
    { name: SHEET_USER_ACHIEV, headers: ['user_id', 'achievement_id', 'earned_at'] },
    { name: SHEET_ERROR_LOG, headers: ['timestamp', 'endpoint', 'error_message', 'request_data'] }
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

  Logger.log('Hệ thống Sigma đã được thiết lập thành công!');
}

function doGet(e) {
  try {
    if (!validateToken(e.parameter.token)) {
      return jsonResponse({ status: 'error', message: 'Unauthorized' });
    }

    const userId = e.parameter.user_id || 'anonymous';
    if (!checkRateLimit(userId)) {
      return jsonResponse({ status: 'error', message: 'Rate limit exceeded' });
    }

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

    return jsonResponse({ status: 'error', message: 'Invalid action' });

  } catch (err) {
    logError('doGet', err.message, JSON.stringify(e.parameter));
    return jsonResponse({ status: 'error', message: 'Internal server error' });
  }
}


function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (!validateToken(data.token)) {
      return jsonResponse({ status: 'error', message: 'Unauthorized' });
    }

    const userId = data.user_id;
    if (!checkRateLimit(userId)) {
      return jsonResponse({ status: 'error', message: 'Rate limit exceeded' });
    }

    const action = data.action;

    if (action === 'updateScore') {
      const result = updateUserScore(userId, data.score_delta, data.metadata || '');
      return jsonResponse(result);
    }

    if (action === 'logEvent') {
      logEvent(userId, data.event_name, data.metadata || '');
      return jsonResponse({ status: 'success' });
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

/**
 * Lấy nhóm A/B của user. Nếu user mới → phân nhóm ngẫu nhiên theo config.
 */
function getUserGroup(userId) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);

  // Kiểm tra user đã tồn tại chưa
  const userRows = userSheet.getDataRange().getValues();
  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === userId) {
      return userRows[i][1]; // Trả về variant đã lưu
    }
  }

  // User mới: phân nhóm theo tỷ lệ trong config
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


/**
 * Cập nhật điểm user, ghi log, kiểm tra milestone và achievement.
 */
function updateUserScore(userId, scoreDelta, metadata) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const logSheet  = ss.getSheetByName(SHEET_LOG);

  const userRows = userSheet.getDataRange().getValues();
  let rowIndex   = -1;

  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === userId) {
      rowIndex = i + 1; // 1-based sheet row
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
  logSheet.appendRow([new Date(), userId, 'update_score', scoreDelta, metadata]);

  // Kiểm tra milestone rewards
  let milestoneReward = null;
  const milestones = [500, 1000, 5000, 10000];
  for (const m of milestones) {
    if (newScore >= m && currentScore < m) {
      milestoneReward = { type: 'milestone', threshold: m, message: `🎉 Đạt ${m} điểm!` };
      break;
    }
  }

  // Kiểm tra achievements
  const newBadges = checkAchievements(userId, newScore, userRows[rowIndex - 1][1]);

  return {
    status:   'success',
    new_score: newScore,
    reward:   milestoneReward,
    badges:   newBadges
  };
}


/**
 * Log một sự kiện (không tính điểm).
 */
function logEvent(userId, eventName, metadata) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_LOG);
  logSheet.appendRow([new Date(), userId, eventName, 0, metadata]);
}


/**
 * Trả về bảng xếp hạng top N người chơi.
 */
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


/**
 * Lấy toàn bộ config đang active dưới dạng key-value object.
 * Kết quả được cache 60 giây để giảm đọc Sheets.
 */
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


/**
 * Lấy giá trị một config key cụ thể.
 */
function getConfigValue(key, defaultValue) {
  const config = getAllConfig();
  return (config[key] !== undefined) ? config[key] : defaultValue;
}


// ============================================================
//   ACHIEVEMENT SYSTEM
// ============================================================

/**
 * Kiểm tra và cấp badge cho user nếu đạt ngưỡng.
 * Trả về danh sách badge vừa được mở khoá.
 */
function checkAchievements(userId, newScore, variant) {
  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const achievSheet = ss.getSheetByName(SHEET_ACHIEV);
  const uaSheet     = ss.getSheetByName(SHEET_USER_ACHIEV);

  if (!achievSheet || !uaSheet) return [];

  const achievRows = achievSheet.getDataRange().getValues();
  const uaRows     = uaSheet.getDataRange().getValues();

  // Danh sách achievement_id user đã có
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


/**
 * Lấy danh sách achievements của user.
 */
function getUserAchievements(userId) {
  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const achievSheet = ss.getSheetByName(SHEET_ACHIEV);
  const uaSheet     = ss.getSheetByName(SHEET_USER_ACHIEV);

  if (!achievSheet || !uaSheet) return [];

  const achievRows = achievSheet.getDataRange().getValues();
  const uaRows     = uaSheet.getDataRange().getValues();

  const achievMap = {};
  for (let i = 1; i < achievRows.length; i++) {
    achievMap[achievRows[i][0]] = {
      name: achievRows[i][1], description: achievRows[i][2], icon: achievRows[i][4]
    };
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

/**
 * Validate API secret token.
 */
function validateToken(token) {
  return token === API_SECRET_TOKEN;
}


/**
 * Rate limiting: kiểm tra user có vượt giới hạn request không.
 * Lưu trạng thái trong CacheService (không cần Sheets).
 */
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

/**
 * Trả về JSON response chuẩn.
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Ghi lỗi vào sheet error_log.
 */
function logError(endpoint, errorMessage, requestData) {
  try {
    const ss       = SpreadsheetApp.getActiveSpreadsheet();
    const errSheet = ss.getSheetByName(SHEET_ERROR_LOG);
    if (errSheet) {
      errSheet.appendRow([new Date(), endpoint, errorMessage, requestData]);
    }
  } catch (e) {
    // Tránh vòng lặp lỗi vô hạn
    console.error('logError failed:', e.message);
  }
}


// ============================================================
//   BACKUP TRIGGER (chạy tuần 1 lần qua Time-driven Trigger)
// ============================================================

/**
 * Hàm này đăng ký trong Apps Script Triggers:
 * Edit → Current project's triggers → Add trigger → weeklyBackup → Weekly
 */
function weeklyBackup() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_LOG);
  const csvData  = sheetToCsv(logSheet);

  const fileName = `sigma_game_log_backup_${Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd')}.csv`;
  const folder   = DriveApp.getFolderById('1UtZIWEgv752AHVq3aFfJ6piVtZ2tmvhL');
  folder.createFile(fileName, csvData, MimeType.PLAIN_TEXT);

  // Thống kê tuần
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const totalUsers = userSheet.getLastRow() - 1;

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: `[Sigma] Báo cáo tuần — ${fileName}`,
    body: `Backup hoàn tất.\n\nTổng users: ${totalUsers}\nFile: ${fileName}`
  });
}


/**
 * Chuyển một sheet thành chuỗi CSV.
 */
function sheetToCsv(sheet) {
  const rows = sheet.getDataRange().getValues();
  return rows.map(row =>
    row.map(cell => {
      const s = String(cell).replace(/"/g, '""');
      return s.includes(',') ? `"${s}"` : s;
    }).join(',')
  ).join('\n');
}
