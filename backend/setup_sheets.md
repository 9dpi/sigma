# Hướng dẫn Setup Google Sheets (Database)

## File Google Sheets
- **ID:** `1GJ4BYhdURS7ipmF7Q_mQRHnVJekLzk_7vQJ2OzW8pdk`
- **Link:** https://docs.google.com/spreadsheets/d/1GJ4BYhdURS7ipmF7Q_mQRHnVJekLzk_7vQJ2OzW8pdk

---

## Bước 1 — Tạo các Sheet (Tab)

Mở file Sheets, tạo đúng **7 tab** với tên sau (case-sensitive):

| # | Tên Tab | Mô tả |
|---|---|---|
| 1 | `users` | Dữ liệu người chơi |
| 2 | `game_log` | Lịch sử mọi tương tác |
| 3 | `config` | Cấu hình A/B test & hệ thống |
| 4 | `rate_limit` | (để trống, dự phòng) |
| 5 | `achievements` | Định nghĩa các badge/thành tựu |
| 6 | `user_achievements` | Badge từng user đã đạt |
| 7 | `error_log` | Log lỗi từ Apps Script |

---

## Bước 2 — Cấu trúc từng Sheet

### Sheet: `users`
| Cột | Tên | Kiểu | Ví dụ |
|---|---|---|---|
| A | `user_id` | string | `user_abc123` |
| B | `variant` | string | `A` / `B` / `control` |
| C | `total_score` | number | `1250` |
| D | `last_play` | datetime | `2026-04-03 15:30:00` |
| E | `created_at` | datetime | `2026-04-01 10:00:00` |

### Sheet: `game_log`
| Cột | Tên | Kiểu | Ví dụ |
|---|---|---|---|
| A | `timestamp` | datetime | `2026-04-03 15:30:01` |
| B | `user_id` | string | `user_abc123` |
| C | `action` | string | `update_score` / `spin_wheel` |
| D | `score_delta` | number | `+10` |
| E | `metadata` | string (JSON) | `{"variant":"B"}` |

### Sheet: `config`
| Cột | Tên | Kiểu | Ví dụ |
|---|---|---|---|
| A | `key` | string | `percent_variant_A` |
| B | `value` | string/number | `50` |
| C | `description` | string | `% nhóm A` |
| D | `active` | boolean | `TRUE` |

### Sheet: `achievements`
| Cột | Tên | Kiểu | Ví dụ |
|---|---|---|---|
| A | `achievement_id` | string | `first_500` |
| B | `name` | string | `Rising Star` |
| C | `description` | string | `Đạt 500 điểm đầu tiên` |
| D | `threshold` | number | `500` |
| E | `icon` | string (emoji) | `⭐` |

### Sheet: `user_achievements`
| Cột | Tên | Kiểu | Ví dụ |
|---|---|---|---|
| A | `user_id` | string | `user_abc123` |
| B | `achievement_id` | string | `first_500` |
| C | `earned_at` | datetime | `2026-04-03 16:00:00` |

### Sheet: `error_log`
| Cột | Tên | Kiểu |
|---|---|---|
| A | `timestamp` | datetime |
| B | `endpoint` | string |
| C | `error_message` | string |
| D | `request_data` | string |

---

## Bước 3 — Nhập dữ liệu mẫu vào `config`

Dán dữ liệu sau vào sheet `config` (bắt đầu từ row 2, row 1 là header):

| key | value | description | active |
|---|---|---|---|
| `ab_test_name` | `new_reward_ui` | Tên thí nghiệm hiện tại | TRUE |
| `percent_variant_A` | `50` | % người dùng vào nhóm A | TRUE |
| `percent_variant_B` | `50` | % người dùng vào nhóm B | TRUE |
| `reward_daily_spin_A` | `100` | Phần thưởng vòng quay nhóm A | TRUE |
| `reward_daily_spin_B` | `200` | Phần thưởng vòng quay nhóm B | TRUE |
| `button_color_A` | `#4CAF50` | Màu nút nhóm A | TRUE |
| `button_color_B` | `#FF5722` | Màu nút nhóm B | TRUE |

---

## Bước 4 — Nhập dữ liệu mẫu vào `achievements`

| achievement_id | name | description | threshold | icon |
|---|---|---|---|---|
| `first_click` | Newbie | Lần đầu chơi game | `1` | `🎮` |
| `rising_star` | Rising Star | Đạt 500 điểm | `500` | `⭐` |
| `master_gamer` | Master Gamer | Đạt 1000 điểm | `1000` | `🏆` |
| `legend` | Legend | Đạt 5000 điểm | `5000` | `👑` |
| `eternal` | Eternal | Đạt 10000 điểm | `10000` | `💎` |

---

## Bước 5 — Deploy Apps Script

1. Mở file Google Sheets → **Extensions → Apps Script**
2. Xoá toàn bộ code cũ trong `Code.gs`
3. Copy toàn bộ nội dung từ file `backend/Code.gs` trong repo → dán vào
4. **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Ghi lại URL endpoint dạng:
   `https://script.google.com/macros/s/AKfycb.../exec`
6. Cập nhật `API_URL` trong `frontend/script.js` với URL mới

> ⚠️ **Quan trọng:** Mỗi lần thay đổi code Apps Script phải Deploy lại (Create new deployment hoặc Manage deployments → Update). URL có thể thay đổi nếu tạo mới.

---

## Bước 6 — Kiểm tra kết nối

Mở browser, truy cập URL sau (thay `<YOUR_URL>` bằng endpoint thực):

```
<YOUR_URL>?action=getUserGroup&user_id=test_001&token=Sigma2025
```

Kết quả mong đợi:
```json
{"status":"success","variant":"A"}
```

Đồng thời kiểm tra sheet `users` có xuất hiện dòng `test_001`.
