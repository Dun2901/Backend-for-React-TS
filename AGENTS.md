# Codex documentation router

File này chỉ dùng để điều hướng Codex tới đúng tài liệu và source code. Không lặp lại nội dung chi tiết của các tài liệu bên dưới.

## Điều hướng theo loại công việc

| Công việc | Đọc trước | Source code cần đối chiếu |
| --- | --- | --- |
| Hiểu tổng thể, thêm module hoặc thay đổi luồng hệ thống | `docs/ARCHITECTURE.md` | `src/app.module.ts`, `src/main.ts` và module liên quan |
| Thêm hoặc sửa endpoint, auth, phân quyền hay response contract | `docs/API-GUIDE.md` | Controller và DTO tương ứng trong `src/modules` |
| Thêm hoặc sửa field, index, transaction hay dữ liệu tổng hợp | `docs/DATA-SCHEMA.md` | Schema và service tương ứng trong `src/modules` |
| Cài đặt, biến môi trường và chạy local | `README.md`, `.env.example` | Các chỗ đọc cấu hình trong `src` |
| Thêm hoặc sửa test | `docs/TESTING.md` và tài liệu của contract liên quan | `src/**/*.spec.ts`, `test/**/*.e2e-spec.ts`, service/DTO liên quan |
| Thay đổi xuyên frontend và backend | Cả ba tài liệu trong `docs/` | Mở và đối chiếu source của cả hai project |

## Thứ tự nguồn sự thật

Khi tài liệu và code khác nhau, ưu tiên:

1. Controller và DTO cho API request, route và quyền truy cập.
2. Mongoose schema cho dữ liệu lưu trữ.
3. Service cho nghiệp vụ, transaction và side effect.
4. `src/main.ts` và `src/app.module.ts` cho cấu hình toàn cục.

Sau khi xác nhận code là đúng, cập nhật tài liệu liên quan trong cùng thay đổi.

## Trạng thái hiện tại

Các mục rủi ro và chênh lệch trong `docs/ARCHITECTURE.md` và `docs/API-GUIDE.md` là mô tả trạng thái hiện tại. Không tự động sửa các mục ngoài phạm vi task được giao.
