# BookStore Backend

Backend cho website bán sách, xây dựng bằng NestJS và TypeScript. Ứng dụng cung cấp REST API, Socket.IO gateway và BullMQ workers, sử dụng MongoDB cho dữ liệu nghiệp vụ và Redis cho cache/hàng đợi.

## Công nghệ chính

- NestJS 11, TypeScript và Mongoose
- MongoDB, Redis, BullMQ và Keyv cache
- JWT, Google OAuth và phân quyền theo role
- Socket.IO notifications
- Nodemailer, VNPay Sandbox, Cloudinary và Gemini
- Swagger/OpenAPI

## Tài liệu dự án

| Tài liệu | Khi nào cần đọc |
| --- | --- |
| [Kiến trúc hệ thống](docs/ARCHITECTURE.md) | Hiểu module, request pipeline, auth, checkout, payment, realtime và các rủi ro hiện tại |
| [API Guide](docs/API-GUIDE.md) | Tra route, quyền truy cập, request/response và contract với frontend |
| [Lược đồ dữ liệu](docs/DATA-SCHEMA.md) | Thay đổi schema, transaction, index hoặc invariant nghiệp vụ |
| [Chiến lược kiểm thử](docs/TESTING.md) | Chọn, viết và chạy unit, contract, HTTP smoke hoặc integration test |
| [Điều hướng cho Codex](AGENTS.md) | Xác định tài liệu và source of truth cần đọc theo từng loại task |

## Yêu cầu trước khi chạy

- Node.js và pnpm 11.
- MongoDB. Luồng checkout dùng transaction nhiều document, vì vậy cần MongoDB Atlas hoặc MongoDB local chạy replica set.
- Redis cho cache và BullMQ.
- Credential tương ứng nếu cần dùng Google OAuth, email, VNPay, Cloudinary hoặc Gemini.

## Cài đặt và chạy local

```bash
# 1. Clone project
git clone https://github.com/Dun2901/Backend-for-React-TS.git
cd Backend-for-React-TS

# 2. Cài dependencies theo pnpm-lock.yaml
pnpm install --frozen-lockfile

# 3. Tạo file cấu hình
cp .env.example .env

# 4. Chạy development server
pnpm dev
```

Trên PowerShell, có thể tạo file môi trường bằng:

```powershell
Copy-Item .env.example .env
```

Trước khi chạy, điền các giá trị còn trống trong `.env`. Tối thiểu cần kiểm tra MongoDB, Redis, JWT và các integration được nạp trong môi trường hiện tại. Không commit `.env`.

Các URL mặc định:

| Thành phần | URL |
| --- | --- |
| Backend | `http://localhost:8081` |
| API v1 | `http://localhost:8081/api/v1` |
| Health check | `http://localhost:8081/api/v1/health` |
| Swagger UI | `http://localhost:8081/swagger` |
| Socket.IO notifications | `http://localhost:8081/notifications` |

`CLIENT_URL` phải trùng origin thực tế của frontend để CORS, cookie và Google OAuth hoạt động đúng.

## Cấu hình môi trường

`.env.example` là nguồn cấu hình mẫu duy nhất. Các nhóm biến chính:

| Nhóm | Biến |
| --- | --- |
| Server | `PORT`, `CLIENT_URL`, `SERVER_URL` |
| MongoDB và seed | `MONGODB_URL`, `SHOULD_INIT`, `INIT_PASSWORD` |
| Redis | `REDIS_URL`, `REDIS_CACHE_TTL`, `REDIS_QUEUE_URL` |
| JWT | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRE`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` |
| Email | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_SECRET`, `GOOGLE_REDIRECT_URL` |
| VNPay | `VNPAY_TMN_CODE`, `VNPAY_SECURE_SECRET`, `VNPAY_URL`, các callback URL |
| Cloudinary | Cloud name/key/secret, media folders và cấu hình seed ảnh |
| Chatbot | `GEMINI_API_KEY` |

`SHOULD_INIT` mặc định là `false`. Chỉ bật sau khi đã cấu hình `INIT_PASSWORD` và nguồn ảnh seed. Seed ảnh hỗ trợ hai cách:

- `CLOUDINARY_SEED_IMAGE_ROOT`: đọc ảnh từ thư mục local.
- `CLOUDINARY_SEED_BASE_URL`: dùng ảnh từ URL public.

## Scripts

| Lệnh | Chức năng |
| --- | --- |
| `pnpm dev` | Chạy NestJS ở chế độ watch |
| `pnpm build` | Build ứng dụng vào `dist/` |
| `pnpm lint` | Chạy ESLint và tự sửa lỗi có thể sửa |
| `pnpm format` | Format source/test bằng Prettier |
| `pnpm test` | Chạy unit test |
| `pnpm test:e2e` | Chạy e2e test |
| `pnpm test:cov` | Chạy test và xuất coverage |

## Kiểm thử

Quy ước chi tiết, baseline hiện tại và kế hoạch integration test nằm trong [Chiến lược kiểm thử](docs/TESTING.md).

- Unit/contract tests trong `src/**/*.spec.ts` chạy độc lập, không cần MongoDB, Redis hoặc credential dịch vụ ngoài.
- HTTP smoke test trong `test/app.e2e-spec.ts` kiểm tra `GET /api/v1/health` và success envelope mà không khởi tạo các integration bên ngoài.
- Khi sửa DTO, utility hoặc response contract, cập nhật test tương ứng trong cùng thay đổi.
- Các service nghiệp vụ dùng MongoDB transaction vẫn cần integration test với database test chạy replica set.

## Nguồn sự thật và trạng thái hiện tại

- Route và quyền truy cập: controller/DTO trong `src/modules`.
- Dữ liệu: `schemas/*.schema.ts`.
- Nghiệp vụ và transaction: service của từng module.
- Cấu hình toàn cục: `src/main.ts` và `src/app.module.ts`.
- Các chênh lệch frontend/backend và giới hạn hiện tại được theo dõi trong [mục 11 của tài liệu kiến trúc](docs/ARCHITECTURE.md#11-các-điểm-lệch-và-rủi-ro-hiện-tại).

Khi thay đổi API hoặc schema, cập nhật code frontend liên quan và tài liệu tương ứng trong cùng thay đổi.
