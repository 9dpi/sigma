# UPGRADE V1.1 Hướng Dẫn

## 1. Cập nhật Google Sheets (Database)
Version 1.1 thêm các bảng dữ liệu mới phục vụ cho Dashboard và quản lý Game.
- **Thực hiện:** Truy cập Google Apps Script, mở file `Code.gs`. Trong thanh menu chọn hàm `setupProject` và nhấn **Run** (Chạy).
- Apps Script sẽ tự động tạo thêm 2 sheet mới: `games` và `game_stats`. Đồng thời tải dữ liệu mẫu cho `games`.

## 2. Cập nhật lại Code Backend (Code.gs)
- Nếu bạn tự nâng cấp từ version 1.0, hãy copy nội dung mới nhất của file `backend/Code.gs` và dán đè vào Apps Script editor.
- Cập nhật này mang lại 8 Endpoints API mới cho Admin Dashboard (`getGames`, `addGame`, `toggleGame`, vv) và Frontends.
- **Quan Trọng:** Bạn cần **Deploy** lại (New deployment) và đảm bảo `API_URL` trên `dashboard.html` và `appstore.html` được trỏ tới URL Web App mới này (nếu khác).

## 3. Khởi Dụng Frontend Mới
Version 1.1 bổ sung:
- **`dashboard.html`**: Giao diện Admin quản trị Game, AB Testing và theo dõi lượt chơi. 
- **`appstore.html`**: Giao diện AppCenter cho người dùng chọn và chơi Game theo dạng Hub.

Truy cập trên trình duyệt để kiểm thử:
- Admin: `https://[github.io...]/frontend/dashboard.html`
- User: `https://[github.io...]/frontend/appstore.html`
