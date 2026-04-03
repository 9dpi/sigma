# Hướng dẫn A/B Testing — Sigma Research Platform

## Tổng quan

Hệ thống A/B Testing của Sigma hoạt động dựa trên:
1. **Sheet `config`** trong Google Sheets — nơi định nghĩa tham số thí nghiệm
2. **Apps Script** — tự động phân nhóm user khi gặp lần đầu
3. **Frontend** — fetch config và render giao diện theo nhóm

---

## Tạo thí nghiệm mới

### Bước 1 — Đặt tên thí nghiệm
Trong sheet `config`, cập nhật dòng `ab_test_name`:
```
key:   ab_test_name
value: ten_thi_nghiem_cua_ban
```

### Bước 2 — Điều chỉnh tỷ lệ phân nhóm
```
percent_variant_A = 50   ← % người dùng vào nhóm A
percent_variant_B = 50   ← % người dùng vào nhóm B
```
> Tổng A + B không nhất thiết phải = 100. Phần còn lại vào nhóm `control`.

### Bước 3 — Thêm tham số thí nghiệm
Thêm các dòng mới với key đặt theo quy ước `<tham_so>_<nhom>`:

| key | value | description | active |
|---|---|---|---|
| `reward_spin_A` | `100` | Phần thưởng vòng quay nhóm A | TRUE |
| `reward_spin_B` | `200` | Phần thưởng vòng quay nhóm B | TRUE |
| `button_color_A` | `#4CAF50` | Màu nút nhóm A | TRUE |
| `button_color_B` | `#FF5722` | Màu nút nhóm B | TRUE |

### Bước 4 — Frontend tự động nhận config
Frontend gọi `getConfig` lúc khởi tạo → nhận toàn bộ config dưới dạng JSON → áp dụng theo `userVariant`.

Trong `script.js`, hàm `applyVariantStyle()` đã tự đọc `sysConfig.button_color_A / button_color_B`.

---

## Điều chỉnh thí nghiệm real-time

Chỉ cần **thay đổi giá trị trong Google Sheets** → lưu lại → lần gọi API tiếp theo sẽ nhận config mới (cache 60 giây).

> ✅ **Người dùng cũ không bị đổi nhóm** — variant đã được lưu vào sheet `users`.
> 🆕 **Người dùng mới** sẽ được phân nhóm theo tỷ lệ mới.

---

## Phân tích kết quả

### Trực tiếp trong Google Sheets

1. **Pivot Table** từ sheet `game_log`:
   - Hàng: `user_id`
   - Cột: `action`
   - Giá trị: `SUM(score_delta)`

2. **Kết hợp với sheet `users`** bằng `VLOOKUP` để thêm cột `variant`:
   ```
   =VLOOKUP(B2, users!$A:$B, 2, FALSE)
   ```

3. **So sánh trung bình điểm theo nhóm**:
   ```
   =AVERAGEIF(users!$B:$B, "A", users!$C:$C)
   =AVERAGEIF(users!$B:$B, "B", users!$C:$C)
   ```

### Metrics quan trọng

| Metric | Công thức |
|---|---|
| Avg score per user | `total_score / user_count` theo nhóm |
| Play frequency | Số dòng `game_log` / user theo nhóm |
| Retention (7 ngày) | Users có `last_play > NOW() - 7` |
| Conversion rate | Users đạt mốc 1000 điểm / total users |

---

## Template thí nghiệm mẫu

### Thí nghiệm: So sánh hệ số thưởng vòng quay

**Hypothesis:** Nhóm B nhận phần thưởng cao hơn 2× sẽ có tần suất chơi nhiều hơn 30%.

| Thông số | Nhóm A | Nhóm B |
|---|---|---|
| Tỷ lệ phân nhóm | 50% | 50% |
| reward_spin | 100 | 200 |
| button_color | `#6366f1` | `#f59e0b` |

**Thời gian:** 7 ngày

**Kết quả mong đợi:** So sánh `AVG(sessions/user)` và `AVG(total_score)` giữa 2 nhóm.
