# CHECKPOINT: Sigma LiveOps Platform v1.1
**Ngày tạo:** 03-04-2026
**Trạng thái:** Hoàn thiện và Ổn định (Stable)
**Git Tag:** `v1.1`

## Cập nhật mới trong Phiên bản 1.1
Bản nâng cấp 1.1 mang đến giao diện quản trị Admin hiện đại, Frontend AppStore và hệ thống tối ưu hóa dữ liệu để chuẩn bị cho scale người dùng:

### 1. Kiến trúc Database (Google Sheets)
- **Kế thừa v1.0:** `users`, `config`, `game_log`, `rate_limit`, `achievements`, `user_achievements`, `error_log`.
- **Mở rộng v1.1:** Bổ sung Sheet `games` (Lưu danh mục trò chơi) và `game_stats` (Chỉ số lượt chơi).
- Cập nhật hàm `setupProject` sẵn sàng tạo môi trường mới trên bất kỳ tài khoản Google Workspace nào.

### 2. Module Backend (Apps Script)
- Tích hợp thêm **API Endpoints mới**: `getInitialData`, `getGames`, `addGame`, `toggleGame`, `deleteGame`, `getStats`, `getABResults`, `saveABTest`, `getUserScore`.
- Tính năng **Batch API (`getInitialData`)**: Giảm số lượng request HTTP từ Frontend xuống còn 1 request gộp tổng hợp.
- Hỗ trợ lưu trữ cấu hình A/B Test vào Database một cách năng động.

### 3. Giao diện Frontend (GitHub Pages)
- **App Store/Game Center (`appstore.html`)**: Giao diện Mobile-first dạng lưới, cho phép chọn Mini Games độc lập.
- **Admin Dashboard (`dashboard.html`)**: Giao diện Control Panel cho chủ hệ thống (Bật/Tắt Game, Cấu hình % nhóm A/B, theo dõi Chart Line).
- **Trình điều hướng**: Tích hợp luồng nhảy tab qua lại giữa Game Hub (`index.html`) và Admin Panel.

### 4. Tối ưu Hiệu suất & Trải nghiệm (Caching Solution)
- **Tích hợp SigmaCache**: LocalStorage Caching 60s trên Frontend.
- **Skeleton UI**: Trải nghiệm chờ mượt mà khi load danh sách trò chơi.
- **Service Worker (`sw.js`)**: Offline-first design và caching cho các file CSS/JS/HTML tĩnh tĩnh.

### 5. Cơ chế Bảo mật GitHub
Tích hợp các biện pháp ngăn chặn hành vi thay thế, sửa đổi repo cũng như rò rỉ JWT:
- `.gitignore` cho môi trường.
- `.github/CODEOWNERS` buộc Review PR trên folder `/backend/`.
- `SECURITY.md` thiết lập Report Advisory Workflow.
- `.github/dependabot.yml`.

## Hướng dẫn phục hồi / Deploy
1. Để lấy mã nguồn JS/HTML: Clone Tag `v1.1`.
2. Để lấy Apps Script Backend: Copy toàn bộ nội dung `backend/Code.gs` và Deploy (Web App). URL được cập nhật vào biến `API_URL` phía `script.js` & `appstore.html`.

---
*Dữ liệu đang được lưu trữ toàn vẹn tại Repo GitHub 9dpi/sigma.*
