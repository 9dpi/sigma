Tài liệu kiến trúc hệ thống Sigma
Dự án: Nghiên cứu & xây dựng nền tảng LiveOps (Mini game, A/B testing, Gamification)
Phiên bản: 1.0
Ngày cập nhật: 3/4/2026

Mục lục
1. Tổng quan kiến trúc
2. Các thành phần chi tiết
3. Luồng dữ liệu và xử lý
4. Cấu trúc Google Sheets (CSDL)
5. Code mẫu cho Google Apps Script
6. Code mẫu cho Frontend (HTML/JS)
7. Hướng dẫn A/B Testing
8. Triển khai và vận hành
9. Bảo mật và lưu ý
--
1. Tổng quan kiến trúc
Sigma sử dụng kiến trúc serverless, chi phí thấp, dễ thay đổi, phù hợp cho mục đích nghiên cứu.

┌─────────────────┐     ┌─────────────────────────────┐
│   Người chơi    │────▶│  Frontend (HTML/JS/CSS)      │
│  (Web browser)  │     │  Hosted trên GitHub Pages    │
└─────────────────┘     └─────────────┬───────────────┘
                                       │
                                       │ HTTP GET/POST
                                       ▼
┌─────────────────────────────────────────────────────────┐
│              Google Apps Script (Web App)               │
│              Đóng vai trò là REST API layer             │
│         Endpoint: (đã deploy chế độ Anyone)             │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
              │ read/write                │ read/write
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│    Google Sheets        │   │   Google Drive          │
│  (Database chính)       │   │  (Lưu file log, ảnh)    │
│  - users                │   │                         │
│  - game_log             │   │                         │
│  - config               │   │                         │
└─────────────────────────┘   └─────────────────────────┘
              │
              │ quản lý code
              ▼
┌─────────────────────────────────────────────────────────┐
│            GitHub Repository (9dpi/sigma)               │
│  - Mã nguồn frontend (index.html, style.css, script.js)│
│  - Mã nguồn backend (Google Apps Script code backup)   │
│  - Tài liệu, ghi chú nghiên cứu                         │
└─────────────────────────────────────────────────────────┘

Các ID và địa chỉ quan trọng
Thành phần	Giá trị	Ghi chú
Google Drive (Root)	1UtZIWEgv752AHVq3aFfJ6piVtZ2tmvhL	Thư mục chứa toàn bộ dữ liệu dự án
Google Sheets (CSDL)	1GJ4BYhdURS7ipmF7Q_mQRHnVJekLzk_7vQJ2OzW8pdk	File .gsheet chính
Google Apps Script (Web App)	AKfycbzwvvzvkdjiNyE_Bb05A-UExtYyEF2dD1YPUkkyEfM4YVQi3ypRJqaqLnvUoPfS90y8	Đã deploy với quyền Anyone
GitHub Repository	https://github.com/9dpi/sigma	Quản lý mã nguồn và version control

2. Các thành phần chi tiết
2.1 Google Sheets – Database chính
Vai trò: Lưu trữ toàn bộ dữ liệu có cấu trúc: người dùng, điểm số, cấu hình thí nghiệm.

Ưu điểm: Trực quan, dễ dàng xuất file CSV, có thể chỉnh sửa thủ công khi cần.

Giới hạn: Tối đa 10 triệu ô, phù hợp cho nghiên cứu với < 100.000 người dùng.

2.2 Google Apps Script – Tầng API
Vai trò: Nhận request từ frontend, xử lý logic (gán nhóm A/B, cập nhật điểm, lấy bảng xếp hạng), đọc/ghi vào Sheets.

Chế độ deploy: Anyone (kể cả người dùng chưa đăng nhập Google) để frontend có thể gọi được.

Phương thức hỗ trợ: doGet(), doPost(), trả về dữ liệu dạng JSON.

2.3 GitHub – Quản lý mã nguồn và hosting tĩnh
Vai trò: Lưu trữ code frontend (HTML/JS/CSS) và tài liệu.

GitHub Pages: Dùng để host giao diện game với đường dạng https://9dpi.github.io/sigma.

2.4 Frontend – Mini game
Công nghệ: HTML5, CSS3, JavaScript thuần (hoặc có thể dùng React/Vue tùy ý).

Tương tác: Gửi HTTP request đến Apps Script, nhận cấu hình và hiển thị giao diện theo nhóm A/B.

3. Luồng dữ liệu và xử lý
3.1 Người chơi truy cập game lần đầu
text
1. Browser → GitHub Pages: Tải index.html, script.js
2. script.js → Gọi GET request đến Apps Script (kèm user_id mới)
3. Apps Script → Đọc sheet 'config', gán user vào nhóm A/B (lưu vào sheet 'users')
4. Apps Script → Trả về biến thể (ví dụ: {variant: "A", reward_multiplier: 1})
5. Frontend → Render giao diện/phần thưởng theo biến thể
3.2 Người chơi thực hiện hành động trong game (đạt điểm, hoàn thành nhiệm vụ)
text
1. Frontend → Gọi POST request đến Apps Script, body: {user_id, action, score}
2. Apps Script → Xác thực dữ liệu, kiểm tra user có tồn tại
3. Apps Script → Ghi log vào sheet 'game_log' (thời gian, user_id, action, score)
4. Apps Script → Cập nhật tổng điểm/xếp hạng vào sheet 'users'
5. Apps Script → Trả về thông báo thành công (hoặc phần thưởng)
6. Frontend → Hiển thị thông báo cho người chơi
3.3 Nhà nghiên cứu thay đổi cấu hình A/B test
text
1. Mở Google Sheets → sheet 'config'
2. Sửa giá trị (ví dụ: tỷ lệ phần trăm nhóm B từ 30% lên 50%)
3. Lưu lại (Google Sheets tự động lưu)
4. Lần gọi API tiếp theo → Apps Script sẽ đọc giá trị mới từ sheet
5. Người dùng mới sẽ được phân nhóm theo tỷ lệ mới
4. Cấu trúc Google Sheets (CSDL)
Tạo 3 sheet (tab) trong file Google Sheets có ID 1GJ4BYhdURS7ipmF7Q_mQRHnVJekLzk_7vQJ2OzW8pdk.

4.1 Sheet: users
Lưu thông tin người chơi.

Column	Type	Description	Example
user_id	string	ID duy nhất (tự sinh hoặc từ game)	player_001
variant	string	Nhóm A/B test (A, B, control)	B
total_score	number	Tổng điểm tích lũy	1250
last_play	datetime	Lần chơi gần nhất	2025-04-03 15:30:00
created_at	datetime	Ngày tham gia	2025-04-01 10:00:00
4.2 Sheet: game_log
Lưu lịch sử từng tương tác.

Column	Type	Description	Example
timestamp	datetime	Thời điểm xảy ra hành động	2025-04-03 15:30:01
user_id	string	ID người chơi	player_001
action	string	Tên hành động (click, complete, share)	click_spin
score_delta	number	Điểm thay đổi (+/-)	+10
metadata	string	Dữ liệu kèm theo (dạng JSON string)	{"wheel_result": "gold"}
4.3 Sheet: config
Lưu cấu hình hệ thống và A/B test.

Column	Type	Description	Example
key	string	Tên tham số cấu hình	reward_multiplier_B
value	string/num	Giá trị tương ứng	2
description	string	Giải thích (optional)	Hệ số thưởng cho nhóm B
active	boolean	Cấu hình có đang được áp dụng?	TRUE
Ví dụ dữ liệu mẫu trong sheet config:

key	value	description	active
ab_test_name	new_reward_ui	Tên thí nghiệm hiện tại	TRUE
percent_variant_A	50	% người dùng vào nhóm A	TRUE
percent_variant_B	50	% người dùng vào nhóm B	TRUE
reward_daily_spin_A	100	Phần thưởng vòng quay nhóm A	TRUE
reward_daily_spin_B	200	Phần thưởng vòng quay nhóm B	TRUE
5. Code mẫu cho Google Apps Script
Truy cập Extensions → Apps Script trong file Google Sheets của bạn. Dán code sau vào, sau đó Deploy → New deployment (chọn loại Web app, execute as "Me", access "Anyone").
// ========== CẤU HÌNH ==========
const SHEET_USERS = 'users';
const SHEET_LOG = 'game_log';
const SHEET_CONFIG = 'config';

// ========== HÀM KHỞI TẠO ==========
function doGet(e) {
  // Xử lý GET request (đọc dữ liệu, lấy cấu hình)
  const action = e.parameter.action;
  
  if (action === 'getUserGroup') {
    const userId = e.parameter.user_id;
    const group = getUserGroup(userId);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      variant: group
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getLeaderboard') {
    const leaderboard = getLeaderboard();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: leaderboard
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: 'Invalid action'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Xử lý POST request (ghi dữ liệu)
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === 'updateScore') {
    const userId = data.user_id;
    const scoreDelta = data.score_delta;
    const metadata = data.metadata || '';
    
    const result = updateUserScore(userId, scoreDelta, metadata);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'logEvent') {
    const userId = data.user_id;
    const eventName = data.event_name;
    const metadata = data.metadata || '';
    
    logEvent(userId, eventName, metadata);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: 'Invalid action'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ========== HÀM XỬ LÝ CHÍNH ==========
function getUserGroup(userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  
  // Kiểm tra user đã tồn tại chưa
  const userRows = userSheet.getDataRange().getValues();
  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === userId) {
      return userRows[i][1]; // Trả về variant đã lưu
    }
  }
  
  // User mới: phân nhóm dựa trên config
  const percentA = getConfigValue('percent_variant_A', 50);
  const percentB = getConfigValue('percent_variant_B', 50);
  
  const rand = Math.random() * 100;
  let variant = 'A';
  if (rand < percentA) variant = 'A';
  else if (rand < percentA + percentB) variant = 'B';
  else variant = 'control';
  
  // Lưu user mới
  userSheet.appendRow([userId, variant, 0, new Date(), new Date()]);
  return variant;
}

function updateUserScore(userId, scoreDelta, metadata) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const logSheet = ss.getSheetByName(SHEET_LOG);
  
  // Tìm user và cập nhật điểm
  const userRows = userSheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === userId) {
      rowIndex = i + 1; // Sheet row index (1-based)
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { status: 'error', message: 'User not found' };
  }
  
  const currentScore = userRows[rowIndex - 1][2];
  const newScore = currentScore + scoreDelta;
  userSheet.getRange(rowIndex, 3).setValue(newScore);
  userSheet.getRange(rowIndex, 4).setValue(new Date());
  
  // Ghi log
  logSheet.appendRow([new Date(), userId, 'update_score', scoreDelta, metadata]);
  
  // Kiểm tra phần thưởng đặc biệt (ví dụ: đạt mốc 1000 điểm)
  let reward = null;
  if (newScore >= 1000 && currentScore < 1000) {
    reward = { type: 'badge', name: 'Master Gamer' };
  }
  
  return {
    status: 'success',
    new_score: newScore,
    reward: reward
  };
}

function logEvent(userId, eventName, metadata) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_LOG);
  logSheet.appendRow([new Date(), userId, eventName, 0, metadata]);
}

function getLeaderboard(limit = 10) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);
  const userRows = userSheet.getDataRange().getValues();
  
  // Bỏ qua header, sắp xếp theo total_score giảm dần
  const users = userRows.slice(1);
  users.sort((a, b) => b[2] - a[2]);
  
  const leaderboard = users.slice(0, limit).map(user => ({
    user_id: user[0],
    total_score: user[2]
  }));
  
  return leaderboard;
}

function getConfigValue(key, defaultValue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  const configRows = configSheet.getDataRange().getValues();
  
  for (let i = 1; i < configRows.length; i++) {
    if (configRows[i][0] === key && configRows[i][3] === true) {
      return configRows[i][1];
    }
  }
  return defaultValue;
}

6. Code mẫu cho Frontend (HTML/JS)
Tạo file index.html trong repository GitHub 9dpi/sigma.

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sigma - Mini Game Research</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        #game-area { margin: 20px auto; padding: 20px; border: 2px solid #ccc; width: 300px; }
        button { font-size: 18px; padding: 10px 20px; margin: 10px; cursor: pointer; }
        #score { font-size: 24px; font-weight: bold; color: green; }
        .reward { color: red; font-weight: bold; }
    </style>
</head>
<body>
    <h1>🎮 Sigma Research Platform</h1>
    <div id="game-area">
        <p>Điểm của bạn: <span id="score">0</span></p>
        <button id="clickBtn">🔘 Click để +10 điểm</button>
        <button id="spinBtn">🎡 Vòng quay may mắn</button>
        <p id="message"></p>
    </div>

    <script>
        // Lấy user_id từ localStorage (hoặc sinh mới)
        let userId = localStorage.getItem('sigma_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 8);
            localStorage.setItem('sigma_user_id', userId);
        }
        
        // Biến lưu nhóm A/B
        let userVariant = 'A';
        
        // Apps Script URL
        const API_URL = 'https://script.google.com/macros/s/AKfycbzwvvzvkdjiNyE_Bb05A-UExtYyEF2dD1YPUkkyEfM4YVQi3ypRJqaqLnvUoPfS90y8/exec';
        
        // Khởi tạo: lấy nhóm A/B của user
        async function initUser() {
            try {
                const response = await fetch(`${API_URL}?action=getUserGroup&user_id=${userId}`);
                const data = await response.json();
                userVariant = data.variant;
                console.log(`User ${userId} thuộc nhóm ${userVariant}`);
                document.getElementById('message').innerHTML = `🎯 Bạn đang ở nhóm <strong>${userVariant}</strong>`;
            } catch (error) {
                console.error('Lỗi khi lấy nhóm:', error);
            }
        }
        
        // Gửi sự kiện cập nhật điểm
        async function updateScore(delta, actionName) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors', // Quan trọng: để tránh lỗi CORS khi gọi từ GitHub Pages
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'updateScore',
                        user_id: userId,
                        score_delta: delta,
                        metadata: JSON.stringify({ action: actionName, variant: userVariant })
                    })
                });
                
                // Hiển thị tạm thời (do no-cors không đọc được response body)
                const currentScoreElem = document.getElementById('score');
                let currentScore = parseInt(currentScoreElem.innerText);
                currentScore += delta;
                currentScoreElem.innerText = currentScore;
                
                document.getElementById('message').innerHTML = `✅ +${delta} điểm! (Nhóm ${userVariant})`;
                setTimeout(() => {
                    document.getElementById('message').innerHTML = '';
                }, 2000);
            } catch (error) {
                console.error('Lỗi khi cập nhật điểm:', error);
            }
        }
        
        // Xử lý vòng quay (ví dụ)
        function spinWheel() {
            // Logic thưởng khác nhau theo nhóm A/B
            let reward = 0;
            if (userVariant === 'A') {
                reward = Math.floor(Math.random() * 100) + 10;  // 10-110 điểm
            } else if (userVariant === 'B') {
                reward = Math.floor(Math.random() * 200) + 20;  // 20-220 điểm
            } else {
                reward = Math.floor(Math.random() * 50) + 5;    // 5-55 điểm (control)
            }
            
            updateScore(reward, 'spin_wheel');
            document.getElementById('message').innerHTML += ` 🎁 Bạn quay được ${reward} điểm!`;
        }
        
        // Gắn sự kiện cho nút bấm
        document.getElementById('clickBtn').addEventListener('click', () => {
            let basePoint = 10;
            if (userVariant === 'B') basePoint = 20;  // Nhóm B được thưởng gấp đôi
            updateScore(basePoint, 'click_button');
        });
        
        document.getElementById('spinBtn').addEventListener('click', spinWheel);
        
        // Chạy hàm khởi tạo khi trang load
        initUser();
        
        // (Tùy chọn) Lấy bảng xếp hạng và hiển thị
        async function showLeaderboard() {
            const response = await fetch(`${API_URL}?action=getLeaderboard`);
            const data = await response.json();
            console.log('Bảng xếp hạng:', data);
        }
        // showLeaderboard(); // Bỏ comment nếu muốn gọi
    </script>
</body>
</html>

7. Hướng dẫn A/B Testing
7.1 Tạo một thí nghiệm mới
Mở sheet config.

Thêm các dòng mới:

ab_test_name = new_button_color

percent_variant_A = 50, percent_variant_B = 50

button_color_A = #4CAF50, button_color_B = #FF5722

Trong code frontend, khi nhận được userVariant, áp dụng màu sắc tương ứng.

7.2 Phân tích kết quả
Dùng pivot table trong Google Sheets hoặc export sang Google Data Studio (Looker Studio) để so sánh:

Tổng điểm trung bình giữa các nhóm.

Số lần chơi/người dùng.

Tỷ lệ quay lại (dựa trên last_play).

7.3 Điều chỉnh thí nghiệm real-time
Thay đổi giá trị percent_variant_A và percent_variant_B trong sheet config bất kỳ lúc nào.

Người dùng mới sẽ được phân nhóm theo tỷ lệ mới ngay lập tức (không ảnh hưởng người cũ).

8. Triển khai và vận hành
8.1 Triển khai Frontend lên GitHub Pages
Push file index.html lên repository https://github.com/9dpi/sigma.

Vào Settings → Pages của repository.

Chọn branch main, thư mục gốc /(root).

Lưu lại, sau vài phút truy cập https://9dpi.github.io/sigma.

8.2 Kiểm tra kết nối
Mở trình duyệt ở chế độ ẩn danh, truy cập GitHub Pages link.

Mở Google Sheets, xem sheet users và game_log có dữ liệu mới được ghi vào không.

Nếu không thấy, kiểm tra CORS (nên dùng mode: 'no-cors' như trong code mẫu).

8.3 Backup dữ liệu
Google Sheets tự động lưu lịch sử phiên bản (File → Version history).

Định kỳ (1 tuần/lần) export sheet game_log sang file CSV lưu vào Google Drive.

9. Bảo mật và lưu ý
9.1 Về chế độ Anyone của Apps Script
Ưu điểm: Frontend tĩnh (GitHub Pages) có thể gọi API mà không cần xác thực phức tạp.

Nhược điểm: Bất kỳ ai có URL cũng có thể gửi request.

Giảm thiểu rủi ro:

Thêm token đơn giản trong request (ví dụ: ?token=Sigma2025).

Giới hạn rate bằng cách lưu IP tạm thời trong sheet rate_limit.

9.2 Về dữ liệu người dùng
Không lưu thông tin nhạy cảm (email, số điện thoại) nếu không cần.

Nếu có, hãy thông báo và tuân thủ GDPR (nếu áp dụng).

9.3 Chi phí
Google Sheets, Apps Script, GitHub Pages: Miễn phí.

Giới hạn Apps Script: 20.000 lần gọi/ngày (với tài khoản cá nhân), đủ cho nghiên cứu quy mô nhỏ.

Kết luận
Hệ thống Sigma cung cấp một nền tảng hoàn chỉnh, chi phí thấp, dễ dàng tùy chỉnh để nghiên cứu:

Cơ chế Gamification: Điểm số, bảng xếp hạng, thành tựu (có thể mở rộng).

A/B Testing real-time: Thay đổi cấu hình trong Google Sheets, áp dụng ngay lập tức.

Phân tích dữ liệu: Dùng Google Sheets hoặc kết nối với Looker Studio.

Mọi mã nguồn và cấu hình đều được quản lý trên GitHub, dễ dàng chia sẻ và phát triển thêm.

Hướng phát triển tiếp theo:

Thêm nhiều mini game phức tạp hơn (kéo thả, bấm giờ, câu đố).

Tích hợp hệ thống "thành tựu" (badges, level).

Dùng Google Cloud Functions thay vì Apps Script nếu cần hiệu năng cao hơn.