# Sigma API Reference

**Base URL:** `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

> ⚠️ Mọi request đều phải kèm token: `?token=Sigma2025` (GET) hoặc `"token": "Sigma2025"` trong body (POST).

---

## GET Endpoints

### `getUserGroup`
Trả về nhóm A/B của user. Nếu user mới → tự động phân nhóm và lưu vào Sheets.

**Request:**
```
GET ?action=getUserGroup&user_id={userId}&token=Sigma2025
```

**Response:**
```json
{
  "status": "success",
  "variant": "A"
}
```
`variant` có thể là: `"A"` | `"B"` | `"control"`

---

### `getLeaderboard`
Trả về bảng xếp hạng top N người chơi.

**Request:**
```
GET ?action=getLeaderboard&limit=10&user_id={userId}&token=Sigma2025
```

**Response:**
```json
{
  "status": "success",
  "data": [
    { "rank": 1, "user_id": "user_abc", "variant": "B", "total_score": 5200 },
    { "rank": 2, "user_id": "user_xyz", "variant": "A", "total_score": 3100 }
  ]
}
```

---

### `getConfig`
Trả về toàn bộ cấu hình A/B test đang active (cached 60 giây).

**Request:**
```
GET ?action=getConfig&user_id={userId}&token=Sigma2025
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "ab_test_name": "new_reward_ui",
    "percent_variant_A": 50,
    "button_color_A": "#4CAF50",
    "button_color_B": "#FF5722"
  }
}
```

---

### `getAchievements`
Trả về danh sách achievements user đã đạt được.

**Request:**
```
GET ?action=getAchievements&user_id={userId}&token=Sigma2025
```

**Response:**
```json
{
  "status": "success",
  "data": [
    { "name": "Rising Star", "description": "Đạt 500 điểm", "icon": "⭐", "earned_at": "..." }
  ]
}
```

---

## POST Endpoints

> POST requests dùng `mode: 'no-cors'` khi gọi từ GitHub Pages → **không đọc được response body**.
> Dùng `cors` mode nếu backend đã xử lý CORS headers.

### `updateScore`
Cập nhật điểm, ghi log, kiểm tra milestone & achievement.

**Request Body:**
```json
{
  "action": "updateScore",
  "user_id": "user_abc123",
  "score_delta": 10,
  "metadata": "{\"source\":\"click_button\",\"variant\":\"A\"}",
  "token": "Sigma2025"
}
```

**Response:**
```json
{
  "status": "success",
  "new_score": 510,
  "reward": {
    "type": "milestone",
    "threshold": 500,
    "message": "🎉 Đạt 500 điểm!"
  },
  "badges": [
    { "id": "rising_star", "name": "Rising Star", "icon": "⭐" }
  ]
}
```

---

### `logEvent`
Log một sự kiện bất kỳ (không tính điểm).

**Request Body:**
```json
{
  "action": "logEvent",
  "user_id": "user_abc123",
  "event_name": "page_view",
  "metadata": "{\"page\":\"leaderboard\"}",
  "token": "Sigma2025"
}
```

**Response:**
```json
{ "status": "success" }
```

---

## Error Responses

| HTTP / Status | Mô tả |
|---|---|
| `{ "status": "error", "message": "Unauthorized" }` | Token sai hoặc thiếu |
| `{ "status": "error", "message": "Rate limit exceeded" }` | Vượt quá 30 request/phút |
| `{ "status": "error", "message": "User not found" }` | `user_id` không tồn tại (updateScore) |
| `{ "status": "error", "message": "Internal server error" }` | Lỗi không xác định (xem sheet `error_log`) |

---

## Rate Limiting
- Tối đa **30 request/user/60 giây**
- Implement bằng `CacheService` (không cần sheet)
- Khi vượt giới hạn → trả về `{ status: "error", message: "Rate limit exceeded" }`
