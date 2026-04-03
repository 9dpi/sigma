# Chính sách bảo mật (Security Policy)

## Các phiên bản được hỗ trợ
Chúng tôi cam kết đảm bảo bảo mật cho các bản phát hành chính thức:

| Phiên bản | Trạng thái bảo mật |
| --------- | ------------------ |
| 1.1.x     | ✅ Được hỗ trợ         |
| 1.0.x     | ✅ Được hỗ trợ         |
| < 1.0     | ❌ Hết hỗ trợ        |

## Quản lý mã nguồn & Files trên GitHub
Dự án Sigma lưu trữ các tài liệu kiến trúc và giao diện frontend trên GitHub. Vì đây là kho lưu trữ có thể đối mặt với rủi ro rò rỉ token API, do đó:
- **Tất cả các Token** (`API_TOKEN`, URL Web App) được coi là cấp độ ứng dụng test. Nếu chuyển sang Production, chúng sẽ bị vô hiệu hóa ở bản public.
- File backend (Apps Script) đặt trong repo GitHub chỉ mang tính chất *tham khảo mã nguồn*, tuyệt đối KHÔNG chứa App Crendentials thật.

## Báo cáo lỗ hổng (Reporting a Vulnerability)

Nếu bạn tìm thấy bất kỳ vấn đề nào liên quan đến rò rỉ JWT token, lỗ hổng A/B Database hay XSS trên Frontend, xin KHÔNG tạo issue hoặc pull request công khai.

1. Hãy gửi luồng lỗi thông qua chức năng **Security Advisories** (Báo cáo riêng tư) trên thanh công cụ Security của GitHub.
2. Chúng tôi sẽ phản hồi lại bạn sau 48 đến 72 giờ để đánh giá mức độ nghiêm trọng và tạo bản patch.
