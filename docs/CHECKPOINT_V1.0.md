# Project Checkpoint — Sigma v1.0 (LiveOps Platform)

**Thời gian:** 2026-04-03 13:13:00  
**Phiên bản:** 1.0 (Initial Stable Release)  
**Trạng thái:** ✅ Sẵn sàng vận hành (Live)

---

## 🏗️ Trạng thái Hạ tầng (Infrastructure)

- **Backend (Google Apps Script):** Đã triển khai bản `v2.0` với cơ chế auto-setup cực nhanh.
- **Database (Google Sheets):** Cấu trúc 7 sheet chuẩn hóa, hỗ trợ log sự kiện, cấu hình real-time và hệ thống thành tựu.
- **Frontend (GitHub Pages):** Giao diện Dark-UI responsive, tích hợp 3 mini-game và hệ thống thông báo thời gian thực.
- **Security:** Token `Sigma2025`, CacheService Rate Limiting (30 req/user/min).

---

## 🚀 Tính năng v1.0 đã hoàn thiện

1.  **A/B Testing Real-time:** Thay đổi cấu hình nhóm A/B ngay trong Google Sheets mà không cần chỉnh code.
2.  **3 Mini Games:**
    *   Click Challenge (Nhóm B nhận 2x điểm).
    *   Spin Wheel (Phần thưởng random, tối đa 200 điểm cho nhóm B).
    *   Timed Click (Thí nghiệm tốc độ, multiplier 2x-3x).
3.  **Hệ thống Gamification:**
    *   Leaderboard Top 10 tự động làm mới mỗi 30 giây.
    *   Achievement System (Badge) dựa trên mốc điểm: 1, 500, 1000, 5000, 10000.
    *   Milestone Popups & Toasts chúc mừng người chơi.
4.  **Vận hành & Backup:**
    *   Cơ chế Weekly Backup tự động đẩy CSV vào Google Drive.
    *   Hệ thống Error Logging tập trung vào sheet `error_log`.

---

## 📂 Danh sách Snapshot Files (v1.0)

| File | Chức năng chính |
|---|---|
| `backend/Code.gs` | Logic Serverless (6 Endpoints + Security) |
| `frontend/index.html` | Entry point người chơi |
| `frontend/script.js` | Game Core & API Client |
| `backend/setup_sheets.md`| Blueprints cho Database |
| `docs/RESEARCH_GUIDE.md` | Tài liệu quy trình vận hành A/B Test |

---

## 🔮 Lộ trình tiếp theo (v1.1+)

- [ ] Tích hợp **Mini Game #3 (Quiz)** với câu hỏi từ Sheets.
- [ ] Thêm hệ thống **Level/Exp** song song với điểm số.
- [ ] Xây dựng **Looker Studio Dashboard** trực quan hơn.
- [ ] Nâng cấp bảo mật bằng **HMAC Signature** cho toàn bộ request.

---

**Ghi chú:** Phiên bản 1.0 đánh dấu việc hoàn thành toàn bộ khung (framework) nghiên cứu LiveOps cho dự án Sigma.
