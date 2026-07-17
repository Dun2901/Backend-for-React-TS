# Chiến lược kiểm thử BookStore Backend

Tài liệu này mô tả các lớp kiểm thử, phạm vi hiện có và cách mở rộng test cho backend NestJS. Mục tiêu là giúp người phát triển và Codex chọn đúng loại test, chạy test an toàn và không nhầm HTTP smoke test với integration test dùng hạ tầng thật.

## 1. Nguyên tắc

- Unit test phải nhanh, xác định và không gọi MongoDB, Redis, mạng hoặc dịch vụ bên ngoài.
- Contract test phải dùng cùng validation/serialization configuration với ứng dụng khi có thể.
- Integration test phải dùng database và Redis dành riêng cho test; tuyệt đối không dùng dữ liệu development hoặc production.
- Test không gọi thật Google OAuth, SMTP, VNPay, Cloudinary hoặc Gemini. Các ranh giới này phải được mock/fake, trừ khi có một test sandbox riêng được chủ động bật.
- Mỗi test tự chuẩn bị dữ liệu và dọn dữ liệu đã tạo; không phụ thuộc thứ tự chạy.
- Bug fix nên có regression test tái hiện lỗi trước khi sửa.

## 2. Các lớp kiểm thử

| Lớp | Mục đích | Vị trí | Hạ tầng ngoài | Trạng thái |
| --- | --- | --- | --- | --- |
| Unit test | Kiểm tra utility, helper và nhánh nghiệp vụ cô lập | `src/**/*.spec.ts` | Không | Đã có baseline |
| Contract test | Kiểm tra DTO validation, response/error envelope và contract ổn định | `src/**/*.spec.ts` | Không | Đã có baseline |
| HTTP smoke test | Kiểm tra routing và HTTP envelope của một lát cắt nhỏ | `test/**/*.e2e-spec.ts` | Không | Đã có health smoke test |
| Integration test | Kiểm tra service với MongoDB replica set, Redis và transaction thật | `test/integration/**/*.integration-spec.ts` | Có, nhưng phải cô lập | Chưa triển khai |
| Full application e2e | Bootstrap `AppModule` và kiểm tra luồng qua nhiều module | `test/e2e/**/*.e2e-spec.ts` | Có | Chưa triển khai |

`test/app.e2e-spec.ts` hiện chỉ dựng `AppController` và `AppService` để kiểm tra `GET /api/v1/health`. Đây là HTTP smoke test, không chứng minh rằng MongoDB, Redis, BullMQ hoặc toàn bộ `AppModule` khởi động thành công.

## 3. Baseline hiện tại

| File | Phạm vi | Số test |
| --- | --- | ---: |
| `src/common/utils/app-url.util.spec.ts` | URL mặc định, callback URL và client redirect | 4 |
| `src/common/utils/redis-connection.util.spec.ts` | Redis URL, port, credential, TLS và URL lỗi | 4 |
| `src/common/helpers/token.helper.spec.ts` | Hash và compare refresh token | 2 |
| `src/common/exceptions/all-exception.filter.spec.ts` | Status/message của HTTP và unknown exception | 3 |
| `src/common/interceptors/transform.interceptor.spec.ts` | Success response envelope | 2 |
| `src/modules/orders/dto/checkout.dto.spec.ts` | Checkout validation và field ngoài contract | 5 |
| `test/app.e2e-spec.ts` | Health HTTP smoke test | 1 |

Tổng baseline: **20 unit/contract tests và 1 HTTP smoke test**. Danh sách file test trong source là nguồn sự thật nếu con số trong tài liệu bị lệch.

## 4. Lệnh chạy test

```bash
# Toàn bộ unit/contract tests
pnpm test -- --runInBand

# HTTP smoke/e2e tests
pnpm test:e2e -- --runInBand

# Coverage
pnpm test:cov -- --runInBand

# Chạy một file cụ thể
pnpm exec jest src/modules/orders/dto/checkout.dto.spec.ts --runInBand

# Kiểm tra build sau test
pnpm build
```

`--runInBand` giúp kết quả ổn định hơn trên máy ít tài nguyên và sẽ cần thiết cho integration test nếu các suite chia sẻ một test database. Unit test thuần có thể bỏ cờ này khi chạy local nếu muốn nhanh hơn.

## 5. Quy ước unit và contract test

### Vị trí và tên file

- Đặt unit/contract test cạnh source: `feature.ts` và `feature.spec.ts`.
- Tên `describe` là thành phần hoặc contract được kiểm tra.
- Tên `it` mô tả hành vi quan sát được, không mô tả chi tiết implementation.

### Phạm vi mock

- Mock repository/model, cache, queue, clock hoặc provider ở ranh giới của unit đang test.
- Không mock chính hàm hoặc service đang được kiểm tra.
- Với service có transaction, unit test kiểm tra nhánh điều phối; integration test mới chứng minh commit/rollback thật.
- Không mock DTO validation bằng kết quả tự dựng. Dùng `ValidationPipe` với `whitelist`, `forbidNonWhitelisted` và `transform` giống `src/main.ts`.

### Trường hợp tối thiểu

Mỗi unit quan trọng nên có:

1. Luồng thành công.
2. Input hoặc trạng thái không hợp lệ.
3. Quyền sở hữu/role nếu có.
4. Side effect quan trọng như cache invalidation, queue hoặc notification.
5. Regression case cho bug đã sửa.

## 6. Chiến lược integration test

### Trạng thái

Integration test với hạ tầng thật **chưa được triển khai**. Khi bổ sung, không sửa unit test thành test phụ thuộc database; tạo suite riêng trong `test/integration`.

### Hạ tầng bắt buộc

- MongoDB test phải chạy replica set vì checkout, hủy đơn và payment dùng transaction nhiều document.
- Redis test phải tách khỏi development bằng instance hoặc key prefix riêng. `parseRedisConnection` hiện không truyền database index trong pathname của `REDIS_QUEUE_URL` sang BullMQ, nên không được dựa riêng vào `/15` để cô lập queue test.
- `SHOULD_INIT=false` để integration test tự quản lý fixture.
- Dùng credential giả hoặc mock adapter cho mail, Cloudinary, Google, VNPay và Gemini.

Test bootstrap nên nạp một file local như `.env.test.local` trước khi import `AppModule`. File này đã được `.gitignore` loại trừ và phải trỏ tới tài nguyên test riêng. Nên từ chối khởi động nếu MongoDB/Redis URL không có dấu hiệu rõ ràng đây là môi trường test.

Ví dụ nhóm cấu hình cần có:

```env
NODE_ENV=test
MONGODB_URL=mongodb://localhost:27017/bookstore_test?replicaSet=rs0
REDIS_URL=redis://localhost:6379/14
REDIS_QUEUE_URL=redis://localhost:6380
SHOULD_INIT=false
```

Không sao chép credential thật vào file test.

### Vòng đời dữ liệu

1. Kết nối hạ tầng test trong global setup hoặc `beforeAll`.
2. Tạo fixture tối thiểu cho từng suite.
3. Dọn collection và Redis keys do suite tạo sau mỗi test hoặc suite.
4. Đóng MongoDB, Redis, BullMQ worker và Nest application trong `afterAll`.
5. Chạy tuần tự nếu nhiều test cùng tác động tồn kho hoặc transaction.

### Các integration test ưu tiên

1. **Checkout thành công:** tạo order, trừ tồn kho, tăng `sold`, xóa đúng cart items và giữ snapshot giá/địa chỉ.
2. **Checkout rollback:** khi một item hết hàng hoặc ghi order lỗi, tồn kho, cart và order phải trở về trạng thái ban đầu.
3. **Hủy đơn:** hoàn kho đúng một lần và không cho transition trạng thái sai.
4. **Refresh token rotation:** token cũ bị vô hiệu, hash mới được lưu và `tokenVersion` hoạt động đúng.
5. **VNPay return/IPN:** kiểm tra chữ ký, amount/order code, idempotency và không đánh dấu `PAID` hai lần.
6. **Review aggregates:** create/update/delete review cập nhật `averageRating`, `reviewCount` và `ratingSummary` đúng.
7. **Soft delete/restore:** query mặc định ẩn document đã xóa và restore không phá unique constraint.
8. **Queue/notification:** job được tạo đúng payload; worker failure retry theo cấu hình mà không tạo side effect trùng.

## 7. Cấu trúc integration test đề xuất

```text
test/
├── app.e2e-spec.ts
├── setup/
│   ├── integration-env.ts
│   └── integration-app.ts
├── fixtures/
│   ├── users.fixture.ts
│   ├── books.fixture.ts
│   └── orders.fixture.ts
└── integration/
    ├── auth.integration-spec.ts
    ├── checkout.integration-spec.ts
    ├── payments.integration-spec.ts
    └── reviews.integration-spec.ts
```

Đây là cấu trúc mục tiêu; các file chưa tồn tại không được xem là test đã triển khai.

Khi tạo integration suite đầu tiên, đồng thời thêm `test/jest-integration.json` và script `test:integration` vào `package.json`. Các lệnh `pnpm test` và `pnpm test:e2e` hiện tại chưa chạy pattern `*.integration-spec.ts`.

## 8. Chọn test theo loại thay đổi

| Thay đổi | Test tối thiểu |
| --- | --- |
| Utility/helper thuần | Unit test |
| DTO hoặc validation rule | Contract test bằng `ValidationPipe` |
| Response/error envelope | Interceptor/filter contract test và HTTP smoke nếu ảnh hưởng route |
| Controller route/quyền | Controller unit test và HTTP test |
| Service với model/cache/queue | Unit test với dependency mock |
| Transaction, inventory hoặc trạng thái order/payment | Unit test và integration test với MongoDB replica set |
| Schema/index/soft delete | Integration test và migration/backfill verification |
| Thay đổi contract frontend/backend | Backend contract test, frontend test tương ứng và cập nhật `API-GUIDE.md` |

## 9. Definition of done

Một thay đổi backend chỉ được coi là hoàn thành khi:

1. Test mới hoặc regression test bao phủ hành vi thay đổi.
2. `pnpm test -- --runInBand` pass.
3. `pnpm test:e2e -- --runInBand` pass nếu thay đổi HTTP bootstrap/contract.
4. Integration test pass nếu thay đổi transaction, persistence hoặc state transition và hạ tầng test đã được triển khai.
5. `pnpm build` pass.
6. Tài liệu API/schema/testing liên quan được cập nhật.
