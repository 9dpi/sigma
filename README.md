# Sigma Research Platform

> **Nền tảng nghiên cứu LiveOps** — Mini game, A/B Testing, và Gamification  
> Kiến trúc serverless, chi phí **$0**, phù hợp nghiên cứu quy mô nhỏ đến vừa.

---

## Kiến trúc hệ thống

```
[Người chơi / Trình duyệt]
        │
        └──► [Frontend — GitHub Pages]
                      │ HTTP GET/POST
                      ▼
           [Google Apps Script]  ← REST API
                      │
             ┌─────────┴──────────┐
             ▼                    ▼
      [Google Sheets]      [Google Drive]
    users / game_log /      (CSV backups)
    config / achievements
```

---

## Cấu trúc thư mục

```
sigma/
├── frontend/
│   ├── index.html       ← Giao diện game chính
│   ├── style.css        ← Design system (dark mode)
│   └── script.js        ← Game logic + API integration
├── backend/
│   ├── Code.gs          ← Google Apps Script (copy vào Apps Script editor)
│   ├── setup_sheets.md  ← Hướng dẫn tạo Google Sheets
│   └── API_REFERENCE.md ← Tài liệu tất cả endpoints
├── docs/
│   └── RESEARCH_GUIDE.md ← Hướng dẫn A/B testing
├── Sigma_system_structure.md ← Tài liệu kiến trúc hệ thống gốc
└── README.md
```

---

## Hướng dẫn Setup (từ đầu)

### Bước 1 — Google Sheets
1. Truy cập Google Sheets ID: `1GJ4BYhdURS7ipmF7Q_mQRHnVJekLzk_7vQJ2OzW8pdk`
2. Làm theo hướng dẫn trong [`backend/setup_sheets.md`](backend/setup_sheets.md)

### Bước 2 — Google Apps Script
1. Trong Google Sheets: **Extensions → Apps Script**
2. Copy nội dung [`backend/Code.gs`](backend/Code.gs) vào editor
3. **Deploy → New deployment** (Web app, Execute as Me, Access: Anyone)
4. Sao chép URL endpoint

### Bước 3 — Cập nhật Frontend
Mở `frontend/script.js`, thay đổi dòng:
```js
const API_URL = 'https://script.google.com/macros/s/<YOUR_DEPLOYMENT_ID>/exec';
const API_TOKEN = 'Sigma2025';  // Thay secret nếu muốn
```

### Bước 4 — Deploy lên GitHub Pages
```bash
git add .
git commit -m "feat: initial Sigma deployment"
git push origin main
```
Vào **Settings → Pages → Source: main / (root)** → Chờ vài phút.

### Bước 5 — Kiểm tra
Truy cập `https://9dpi.github.io/sigma/frontend/` và:
- Mở tab ẩn danh → user mới được tạo
- Kiểm tra sheet `users` có dòng mới
- Click button → `game_log` có log

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| 🎯 A/B Testing | Phân nhóm user ngẫu nhiên, config real-time từ Sheets |
| 🎮 Mini Game 1 | Click Challenge — cộng điểm theo nhóm |
| 🎡 Mini Game 2 | Spin Wheel — phần thưởng ngẫu nhiên theo nhóm |
| ⏱️ Mini Game 3 | Timed Click — 30 giây click càng nhiều càng tốt |
| 🏆 Leaderboard | Top 10 bảng xếp hạng, tự refresh 30 giây |
| ⭐ Achievements | Hệ thống badge/thành tựu theo mốc điểm |
| 📊 Analytics | Pivot table & chart trong Google Sheets |
| 🔒 Security | Token validation + CacheService rate limiting |
| 💾 Backup | Weekly auto-export CSV sang Google Drive |

---

## IDs quan trọng

| Thành phần | Giá trị |
|---|---|
| Google Drive (Root) | `1UtZIWEgv752AHVq3aFfJ6piVtZ2tmvhL` |
| Google Sheets (CSDL) | `1GJ4BYhdURS7ipmF7Q_mQRHnVJekLzk_7vQJ2OzW8pdk` |
| Apps Script Token | `Sigma2025` |
| GitHub Repo | https://github.com/9dpi/sigma |
| GitHub Pages | https://9dpi.github.io/sigma |

---

## Giới hạn hệ thống

| Giới hạn | Giá trị |
|---|---|
| Apps Script calls/ngày | 20.000 (free) |
| Google Sheets max cells | 10 triệu |
| Rate limit (Sigma) | 30 request/user/phút |
| Phù hợp cho | < 100.000 users |

---

## Tài liệu liên quan

- 📘 [API Reference](backend/API_REFERENCE.md)
- 🗄️ [Hướng dẫn Setup Sheets](backend/setup_sheets.md)
- 🔬 [Hướng dẫn A/B Testing](docs/RESEARCH_GUIDE.md)
- 📐 [Kiến trúc hệ thống](Sigma_system_structure.md)
