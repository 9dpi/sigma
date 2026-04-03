 Kiến trúc mở rộng cho Sigma Platform 1.1

 ┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (CHO NGƯỜI CHƠI)                 │
│  Giao diện App Store - Hiển thị danh sách game, thumbnail,   │
│  rating, lượt chơi, leaderboard riêng cho từng game          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND DASHBOARD (CHO ADMIN)                   │
│  - Quản lý game (CRUD)                                       │
│  - Cấu hình tham số (điểm, phần thưởng, A/B test)            │
│  - Báo cáo & thống kê                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Apps Script (API Layer)                  │
│  - Xử lý request từ cả Frontend và Dashboard                 │
│  - Đọc/ghi vào Google Sheets                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Sheets (Database)                        │
│  - games: Danh sách game, config, thumbnail URL              │
│  - game_stats: Thống kê lượt chơi, rating                   │
│  - users, game_log, config... (đã có)                       │
└─────────────────────────────────────────────────────────────┘

📊 Phần 1: Cấu trúc Google Sheets mở rộng
Thêm các sheet mới vào file 1GJ4BYhdURS7ipmF7Q_mQRHnVJekLzk_7vQJ2OzW8pdk:

Sheet games (Quản lý game)
Column	Type	Description	Example
game_id	string	ID duy nhất	click_challenge_v1
game_name	string	Tên hiển thị	Click Challenge
description	text	Mô tả ngắn	Mỗi lần click nhận điểm...
thumbnail_url	string	Link ảnh đại diện	https://...
game_type	string	Loại game (click, spin, timer)	click
config_params	json	Cấu hình JSON	{"base_point":10,"multiplier_B":2}
is_active	boolean	Bật/tắt game	TRUE
display_order	number	Thứ tự hiển thị	1
created_at	datetime	Ngày tạo	2025-04-03
version	string	Phiên bản game	1.0.0
Sheet game_stats (Thống kê)
Column	Type	Description
game_id	string	ID game
total_plays	number	Tổng lượt chơi
avg_score	number	Điểm trung bình
avg_play_time	number	Thời gian chơi TB (giây)
daily_plays	json	Lượt chơi theo ngày
last_updated	datetime	Cập nhật cuối
Sheet game_log (Thêm cột game_id)
Thêm cột game_id vào sheet log hiện có để biết người chơi đang tương tác với game nào.

🖥️ Phần 2: Backend Dashboard (HTML/JS thuần + Apps Script)
2.1 Tạo file dashboard.html trong GitHub repo
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sigma Admin Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        
        /* Header */
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0; opacity: 0.9; }
        
        /* Navigation */
        .nav { background: white; padding: 0 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; gap: 20px; }
        .nav button { background: none; border: none; padding: 15px 20px; cursor: pointer; font-size: 16px; color: #666; transition: all 0.3s; border-bottom: 3px solid transparent; }
        .nav button:hover { color: #667eea; }
        .nav button.active { color: #667eea; border-bottom-color: #667eea; }
        
        /* Main Content */
        .container { max-width: 1400px; margin: 30px auto; padding: 0 20px; }
        .panel { display: none; animation: fadeIn 0.5s; }
        .panel.active { display: block; }
        
        /* Cards */
        .card { background: white; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .card h2 { margin-bottom: 20px; color: #333; font-size: 20px; border-left: 4px solid #667eea; padding-left: 15px; }
        
        /* Form */
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; color: #555; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
        textarea { min-height: 80px; }
        button { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
        button:hover { background: #5a67d8; }
        .btn-danger { background: #e53e3e; }
        .btn-danger:hover { background: #c53030; }
        .btn-success { background: #48bb78; }
        
        /* Table */
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; color: #555; }
        tr:hover { background: #f8f9fa; }
        .game-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; }
        .action-buttons { display: flex; gap: 8px; }
        .action-buttons button { padding: 5px 10px; font-size: 12px; }
        
        /* Stats Grid */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; }
        .stat-card h3 { font-size: 14px; opacity: 0.9; margin-bottom: 10px; }
        .stat-card .value { font-size: 32px; font-weight: bold; }
        
        /* Chart */
        .chart-container { margin-top: 20px; }
        canvas { max-height: 300px; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="header">
        <h1>🎮 Sigma Admin Dashboard</h1>
        <p>Quản lý game, theo dõi hiệu suất, A/B testing</p>
    </div>
    
    <div class="nav">
        <button class="nav-btn active" data-panel="games">🎲 Quản lý Game</button>
        <button class="nav-btn" data-panel="reports">📊 Báo cáo & Thống kê</button>
        <button class="nav-btn" data-panel="abtest">🧪 A/B Testing</button>
    </div>
    
    <div class="container">
        <!-- Panel Quản lý Game -->
        <div id="games-panel" class="panel active">
            <div class="card">
                <h2>➕ Thêm Game mới</h2>
                <form id="addGameForm">
                    <div class="form-group">
                        <label>Game ID (unique)</label>
                        <input type="text" id="game_id" required placeholder="vd: click_challenge_v2">
                    </div>
                    <div class="form-group">
                        <label>Tên Game</label>
                        <input type="text" id="game_name" required>
                    </div>
                    <div class="form-group">
                        <label>Mô tả</label>
                        <textarea id="description"></textarea>
                    </div>
                    <div class="form-group">
                        <label>URL Thumbnail (ảnh đại diện)</label>
                        <input type="url" id="thumbnail_url" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label>Loại Game</label>
                        <select id="game_type">
                            <option value="click">Click Challenge</option>
                            <option value="spin">Vòng quay may mắn</option>
                            <option value="timer">Timed Click</option>
                            <option value="quiz">Trắc nghiệm</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cấu hình (JSON)</label>
                        <textarea id="config_params">{"base_point":10,"multiplier_B":2}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Thứ tự hiển thị</label>
                        <input type="number" id="display_order" value="1">
                    </div>
                    <button type="submit">➕ Thêm Game</button>
                </form>
            </div>
            
            <div class="card">
                <h2>📋 Danh sách Game</h2>
                <div id="gamesList">
                    <p>Đang tải...</p>
                </div>
            </div>
        </div>
        
        <!-- Panel Báo cáo -->
        <div id="reports-panel" class="panel">
            <div class="stats-grid" id="statsGrid">
                <div class="stat-card">
                    <h3>Tổng số người chơi</h3>
                    <div class="value" id="totalUsers">-</div>
                </div>
                <div class="stat-card">
                    <h3>Tổng lượt chơi</h3>
                    <div class="value" id="totalPlays">-</div>
                </div>
                <div class="stat-card">
                    <h3>Điểm trung bình</h3>
                    <div class="value" id="avgScore">-</div>
                </div>
                <div class="stat-card">
                    <h3>Game phổ biến nhất</h3>
                    <div class="value" id="topGame">-</div>
                </div>
            </div>
            
            <div class="card">
                <h2>📈 Lượt chơi theo ngày</h2>
                <canvas id="dailyChart"></canvas>
            </div>
            
            <div class="card">
                <h2>🏆 Top 10 game theo lượt chơi</h2>
                <div id="topGamesList"></div>
            </div>
            
            <div class="card">
                <h2>📊 Hiệu suất A/B Test</h2>
                <div id="abPerformance"></div>
            </div>
        </div>
        
        <!-- Panel A/B Testing -->
        <div id="abtest-panel" class="panel">
            <div class="card">
                <h2>🧪 Quản lý thí nghiệm A/B</h2>
                <form id="abTestForm">
                    <div class="form-group">
                        <label>Tên thí nghiệm</label>
                        <input type="text" id="ab_test_name" required>
                    </div>
                    <div class="form-group">
                        <label>Nhóm A (%)</label>
                        <input type="number" id="percent_A" min="0" max="100" value="50">
                    </div>
                    <div class="form-group">
                        <label>Nhóm B (%)</label>
                        <input type="number" id="percent_B" min="0" max="100" value="50">
                    </div>
                    <div class="form-group">
                        <label>Cấu hình nhóm A (JSON)</label>
                        <textarea id="config_A">{"reward_multiplier":1,"color":"#4CAF50"}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Cấu hình nhóm B (JSON)</label>
                        <textarea id="config_B">{"reward_multiplier":2,"color":"#FF5722"}</textarea>
                    </div>
                    <button type="submit">🚀 Bắt đầu thí nghiệm</button>
                </form>
            </div>
            
            <div class="card">
                <h2>📊 Kết quả thí nghiệm</h2>
                <div id="abResults"></div>
            </div>
        </div>
    </div>

    <script>
        const API_URL = 'https://script.google.com/macros/s/AKfycbzwvvzvkdjiNyE_Bb05A-UExtYyEF2dD1YPUkkyEfM4YVQi3ypRJqaqLnvUoPfS90y8/exec';
        let dailyChart = null;
        
        // Load data khi trang load
        document.addEventListener('DOMContentLoaded', () => {
            loadGames();
            loadStats();
            setupEventListeners();
        });
        
        function setupEventListeners() {
            // Chuyển tab
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const panelId = btn.dataset.panel;
                    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                    document.getElementById(`${panelId}-panel`).classList.add('active');
                    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    if (panelId === 'reports') loadStats();
                    if (panelId === 'abtest') loadABResults();
                });
            });
            
            // Form thêm game
            document.getElementById('addGameForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const gameData = {
                    action: 'addGame',
                    game_id: document.getElementById('game_id').value,
                    game_name: document.getElementById('game_name').value,
                    description: document.getElementById('description').value,
                    thumbnail_url: document.getElementById('thumbnail_url').value,
                    game_type: document.getElementById('game_type').value,
                    config_params: document.getElementById('config_params').value,
                    display_order: parseInt(document.getElementById('display_order').value)
                };
                
                const response = await fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(gameData)
                });
                alert('Đã thêm game!');
                loadGames();
                document.getElementById('addGameForm').reset();
            });
            
            // Form A/B test
            document.getElementById('abTestForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const abData = {
                    action: 'saveABTest',
                    test_name: document.getElementById('ab_test_name').value,
                    percent_A: parseInt(document.getElementById('percent_A').value),
                    percent_B: parseInt(document.getElementById('percent_B').value),
                    config_A: document.getElementById('config_A').value,
                    config_B: document.getElementById('config_B').value
                };
                
                await fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(abData)
                });
                alert('Đã lưu cấu hình A/B test!');
                loadABResults();
            });
        }
        
        async function loadGames() {
            try {
                const response = await fetch(`${API_URL}?action=getGames`);
                const games = await response.json();
                renderGamesList(games);
            } catch (error) {
                console.error('Lỗi load games:', error);
            }
        }
        
        function renderGamesList(games) {
            const container = document.getElementById('gamesList');
            if (!games || games.length === 0) {
                container.innerHTML = '<p>Chưa có game nào.</p>';
                return;
            }
            
            let html = '<table><thead><tr><th>Thumb</th><th>ID</th><th>Tên</th><th>Loại</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>';
            games.forEach(game => {
                html += `
                    <tr>
                        <td><img src="${game.thumbnail_url || 'https://via.placeholder.com/50'}" class="game-thumb" onerror="this.src='https://via.placeholder.com/50'"></td>
                        <td>${game.game_id}</td>
                        <td>${game.game_name}</td>
                        <td>${game.game_type}</td>
                        <td>${game.is_active ? '✅ Hoạt động' : '❌ Tạm dừng'}</td>
                        <td class="action-buttons">
                            <button onclick="toggleGame('${game.game_id}', ${!game.is_active})">${game.is_active ? 'Tạm dừng' : 'Kích hoạt'}</button>
                            <button class="btn-danger" onclick="deleteGame('${game.game_id}')">Xóa</button>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        }
        
        async function toggleGame(gameId, activate) {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'toggleGame',
                    game_id: gameId,
                    is_active: activate
                })
            });
            loadGames();
        }
        
        async function deleteGame(gameId) {
            if (confirm('Xóa game này?')) {
                await fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        action: 'deleteGame',
                        game_id: gameId
                    })
                });
                loadGames();
            }
        }
        
        async function loadStats() {
            try {
                const response = await fetch(`${API_URL}?action=getStats`);
                const stats = await response.json();
                
                document.getElementById('totalUsers').innerText = stats.totalUsers || 0;
                document.getElementById('totalPlays').innerText = stats.totalPlays || 0;
                document.getElementById('avgScore').innerText = stats.avgScore || 0;
                document.getElementById('topGame').innerText = stats.topGame || 'N/A';
                
                // Vẽ biểu đồ
                if (stats.dailyPlays && dailyChart) {
                    dailyChart.data.datasets[0].data = stats.dailyPlays;
                    dailyChart.update();
                } else if (stats.dailyPlays) {
                    const ctx = document.getElementById('dailyChart').getContext('2d');
                    dailyChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: stats.dailyLabels || ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
                            datasets: [{
                                label: 'Lượt chơi',
                                data: stats.dailyPlays,
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                tension: 0.4,
                                fill: true
                            }]
                        }
                    });
                }
                
                // Top games
                if (stats.topGames) {
                    let topHtml = '<table><thead><tr><th>Game</th><th>Lượt chơi</th><th>Điểm TB</th></tr></thead><tbody>';
                    stats.topGames.forEach(game => {
                        topHtml += `<tr><td>${game.game_name}</td><td>${game.total_plays}</td><td>${game.avg_score}</td></tr>`;
                    });
                    topHtml += '</tbody></table>';
                    document.getElementById('topGamesList').innerHTML = topHtml;
                }
            } catch (error) {
                console.error('Lỗi load stats:', error);
            }
        }
        
        async function loadABResults() {
            try {
                const response = await fetch(`${API_URL}?action=getABResults`);
                const results = await response.json();
                
                let html = '<table><thead><tr><th>Thí nghiệm</th><th>Nhóm A</th><th>Nhóm B</th><th>Kết luận</th></tr></thead><tbody>';
                results.forEach(test => {
                    html += `
                        <tr>
                            <td>${test.test_name}</td>
                            <td>Điểm TB: ${test.avg_score_A}<br>Lượt chơi: ${test.plays_A}</td>
                            <td>Điểm TB: ${test.avg_score_B}<br>Lượt chơi: ${test.plays_B}</td>
                            <td>${test.winner === 'A' ? '🏆 Nhóm A thắng' : test.winner === 'B' ? '🏆 Nhóm B thắng' : 'Đang chạy'}</td>
                        </tr>
                    `;
                });
                html += '</tbody></table>';
                document.getElementById('abResults').innerHTML = html || '<p>Chưa có dữ liệu</p>';
            } catch (error) {
                console.error('Lỗi load AB results:', error);
            }
        }
        
        window.toggleGame = toggleGame;
        window.deleteGame = deleteGame;
    </script>
</body>
</html>

📱 Phần 3: Frontend App Store Style
Tạo file appstore.html trong thư mục frontend/
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Sigma Game Center</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f2f2f7;
            padding-bottom: 80px;
        }
        
        /* Header App Store Style */
        .header {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            padding: 15px 20px;
            position: sticky;
            top: 0;
            z-index: 100;
            border-bottom: 0.5px solid rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 34px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header p {
            color: #8e8e93;
            font-size: 14px;
            margin-top: 4px;
        }
        
        /* User Bar */
        .user-bar {
            background: white;
            margin: 15px 20px;
            padding: 12px 16px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .avatar {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }
        
        .user-details h3 {
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .user-details p {
            font-size: 12px;
            color: #8e8e93;
        }
        
        .score-badge {
            background: #34c759;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
        }
        
        /* Category Section */
        .section {
            margin: 24px 20px;
        }
        
        .section-title {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }
        
        .section-title a {
            font-size: 14px;
            color: #667eea;
            text-decoration: none;
        }
        
        /* Game Grid (App Store Style) */
        .games-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }
        
        .game-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        
        .game-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }
        
        .game-thumb {
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .game-info {
            padding: 12px;
        }
        
        .game-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .game-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
        }
        
        .game-rating {
            color: #ff9500;
            font-size: 12px;
        }
        
        .game-plays {
            color: #8e8e93;
            font-size: 11px;
        }
        
        /* Featured Banner */
        .featured-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0 20px 24px;
            padding: 24px;
            border-radius: 20px;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .featured-banner h3 {
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .featured-banner p {
            opacity: 0.9;
            margin-bottom: 16px;
        }
        
        .play-button {
            background: rgba(255,255,255,0.2);
            border: none;
            padding: 10px 20px;
            border-radius: 30px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            backdrop-filter: blur(10px);
        }
        
        /* Modal Game Detail */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            overflow-y: auto;
        }
        
        .modal-content {
            background: white;
            min-height: 100%;
            border-radius: 20px 20px 0 0;
            animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        
        .modal-header {
            position: relative;
            height: 250px;
            background-size: cover;
            background-position: center;
        }
        
        .close-modal {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.5);
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            color: white;
            font-size: 24px;
            cursor: pointer;
            backdrop-filter: blur(5px);
        }
        
        .modal-body {
            padding: 24px;
        }
        
        /* Loading */
        .loading {
            text-align: center;
            padding: 40px;
            color: #8e8e93;
        }
        
        @media (max-width: 480px) {
            .games-grid {
                grid-template-columns: 1fr;
            }
            .section-title {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Sigma Game Center</h1>
        <p>Chơi game, nhận thưởng, leo bảng xếp hạng</p>
    </div>
    
    <div class="user-bar" id="userBar">
        <div class="user-info">
            <div class="avatar" id="avatar">G</div>
            <div class="user-details">
                <h3 id="userName">Gamer</h3>
                <p id="userGroup">Nhóm A</p>
            </div>
        </div>
        <div class="score-badge" id="userScore">0 điểm</div>
    </div>
    
    <div class="featured-banner" id="featuredBanner">
        <h3>🔥 Thử thách tuần này</h3>
        <p>Chơi nhiều nhất tuần nhận quà khủng!</p>
        <button class="play-button" onclick="scrollToGames()">🎮 Chơi ngay</button>
    </div>
    
    <div class="section">
        <div class="section-title">
            <span>📱 Nổi bật</span>
            <a href="#">Xem tất cả →</a>
        </div>
        <div class="games-grid" id="featuredGames">
            <div class="loading">Đang tải game...</div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">
            <span>🎮 Tất cả game</span>
        </div>
        <div class="games-grid" id="allGames">
            <div class="loading">Đang tải...</div>
        </div>
    </div>
    
    <!-- Modal Game Detail -->
    <div id="gameModal" class="modal">
        <div class="modal-content">
            <div class="modal-header" id="modalHeader">
                <button class="close-modal" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modalBody">
                <h2 id="modalTitle"></h2>
                <p id="modalDesc"></p>
                <div id="gameFrame"></div>
            </div>
        </div>
    </div>

    <script>
        const API_URL = 'https://script.google.com/macros/s/AKfycbzwvvzvkdjiNyE_Bb05A-UExtYyEF2dD1YPUkkyEfM4YVQi3ypRJqaqLnvUoPfS90y8/exec';
        let userId = localStorage.getItem('sigma_user_id');
        let userVariant = 'A';
        let games = [];
        
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 8);
            localStorage.setItem('sigma_user_id', userId);
        }
        
        async function init() {
            await loadUserInfo();
            await loadGames();
        }
        
        async function loadUserInfo() {
            try {
                const response = await fetch(`${API_URL}?action=getUserGroup&user_id=${userId}`);
                const data = await response.json();
                userVariant = data.variant;
                document.getElementById('userGroup').innerHTML = `Nhóm ${userVariant}`;
                document.getElementById('avatar').innerHTML = userVariant;
                
                // Load user score
                const scoreResponse = await fetch(`${API_URL}?action=getUserScore&user_id=${userId}`);
                const scoreData = await scoreResponse.json();
                document.getElementById('userScore').innerHTML = `${scoreData.score || 0} điểm`;
                document.getElementById('userName').innerHTML = `Gamer_${userId.slice(-6)}`;
            } catch (error) {
                console.error('Lỗi load user:', error);
            }
        }
        
        async function loadGames() {
            try {
                const response = await fetch(`${API_URL}?action=getGames`);
                games = await response.json();
                renderGames();
            } catch (error) {
                console.error('Lỗi load games:', error);
                document.getElementById('featuredGames').innerHTML = '<p style="color:red">Không thể tải game. Vui lòng thử lại sau.</p>';
            }
        }
        
        function renderGames() {
            const activeGames = games.filter(g => g.is_active);
            const featured = activeGames.slice(0, 2);
            const all = activeGames;
            
            // Render featured
            document.getElementById('featuredGames').innerHTML =

