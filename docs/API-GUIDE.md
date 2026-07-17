# BookStore API Guide

Tài liệu này mô tả hợp đồng API thực tế giữa:

- Frontend React: `01-react-vite-starter`
- Backend NestJS: `backend-for-react-ts`

Phạm vi đối chiếu được chốt ngày 17/07/2026. Thư mục `03-backend-4-react` không được dùng làm nguồn cho tài liệu này.

## 1. Tổng quan

### URL

| Thành phần | URL mặc định |
|---|---|
| Backend origin | `http://localhost:8081` |
| API frontend đang gọi | `http://localhost:8081/api/v1` |
| Health check | `http://localhost:8081/api/v1/health` |
| Swagger UI | `http://localhost:8081/swagger` |
| Socket.IO namespace | `http://localhost:8081/notifications` |

Frontend tự nối `/api/v1` vào `VITE_BACKEND_URL`. Vì vậy biến môi trường phía React chỉ chứa origin:

```env
VITE_BACKEND_URL=http://localhost:8081
```

Không đặt `VITE_BACKEND_URL=http://localhost:8081/api/v1` vì kết quả sẽ bị lặp thành `/api/v1/api/v1`.

Backend bật URI versioning với hai default version `1` và `2`. Ứng dụng React hiện chỉ dùng `/api/v1`; mọi ví dụ trong tài liệu cũng dùng v1.

### Chạy local

Backend:

```bash
cd backend-for-react-ts
pnpm install --frozen-lockfile
pnpm start:dev
```

Frontend:

```bash
cd 01-react-vite-starter
npm install
npm run dev
```

`CLIENT_URL` của backend phải trùng chính xác origin của React để CORS và Google OAuth hoạt động. Vite thường chạy ở cổng 5173, trong khi `.env.example` của backend đang minh họa cổng 3000; cần đồng bộ hai giá trị này.

## 2. Quy ước chung

### Xác thực và phân quyền

Backend áp dụng JWT guard toàn cục. Trừ route có `@Public()`, request phải gửi:

```http
Authorization: Bearer <access_token>
```

Quy ước quyền trong bảng endpoint:

| Ký hiệu | Ý nghĩa |
|---|---|
| Public | Không cần access token |
| User | Cần JWT hợp lệ; cả role `USER` và `ADMIN` đều có thể gọi nếu route không giới hạn thêm |
| Admin | Cần JWT và role `ADMIN` |
| Provider | Callback dành cho dịch vụ ngoài, nhưng quyền thực tế vẫn được ghi theo controller hiện tại |

Frontend lưu access token trong `localStorage` với key `access_token` và tự gắn Bearer token qua Axios interceptor.

Refresh token:

- Được backend đặt trong cookie `refresh_token` với cờ `httpOnly`.
- Axios bật `withCredentials: true` để gửi cookie.
- Khi access token hết hạn, backend trả HTTP `419`.
- Frontend tự gọi `GET /auth/refresh`, lưu access token mới, rồi gửi lại request cũ.
- Nếu refresh thất bại, frontend xóa access token và chuyển về `/login`.
- Login, refresh, đổi mật khẩu và Google OAuth đều có thể xoay vòng refresh token.

### Validation

Backend dùng `ValidationPipe` toàn cục với:

```ts
{
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true
}
```

Hệ quả:

- Field không có trong DTO không bị bỏ qua mà làm request thất bại với HTTP `400`.
- Query/body có thể được ép kiểu nếu DTO dùng `@Type(() => Number)` hoặc transformer tương ứng.
- Client phải gửi đúng tên field trong tài liệu.

### Response thành công

Interceptor toàn cục bọc dữ liệu theo cấu trúc:

```json
{
  "statusCode": 200,
  "message": "Nội dung do endpoint khai báo",
  "data": {}
}
```

Với thao tác tạo mới, `statusCode` thường là `201`.

### Response lỗi

```json
{
  "error": {
    "timestamp": "2026-07-17T10:00:00.000Z",
    "path": "/api/v1/books/not-an-id",
    "statusCode": 400,
    "message": "Nội dung lỗi hoặc mảng lỗi validation"
  }
}
```

Các status thường gặp:

| Status | Ý nghĩa |
|---:|---|
| 400 | Body/query sai, nghiệp vụ không hợp lệ hoặc refresh token không hợp lệ |
| 401 | Thiếu token, token sai hoặc tài khoản không tồn tại |
| 403 | Đúng token nhưng sai role/quyền sở hữu tài nguyên |
| 404 | Không tìm thấy dữ liệu |
| 419 | Access token hết hạn; frontend sẽ thử refresh |
| 422 | File sai loại MIME |
| 429 | Vượt rate limit |
| 500 | Lỗi không được xử lý riêng |

Lưu ý phía React: error interceptor hiện trả trực tiếp body lỗi thay vì luôn `Promise.reject(...)`. Vì vậy một số HTTP error sẽ đi vào nhánh “thành công” của `await` dưới dạng object có field `error`; code gọi API nên kiểm tra cả `res.error`, không chỉ dựa vào `catch`.

### Phân trang

Response phân trang chuẩn:

```json
{
  "statusCode": 200,
  "message": "...",
  "data": {
    "meta": {
      "current": 1,
      "pageSize": 10,
      "pages": 5,
      "total": 42
    },
    "result": []
  }
}
```

Các module Users, Books, Categories dạng admin và Orders dùng cú pháp của `api-query-params`:

| Mục đích | Ví dụ |
|---|---|
| Phân trang | `current=1&pageSize=10` |
| Sắp xếp giảm dần | `sort=-createdAt` |
| Sắp xếp nhiều field | `sort=-sold,price` |
| Tìm không phân biệt hoa thường | `mainText=/nhà giả kim/i` |
| Lọc bằng | `status=PENDING` |
| So sánh | `price>=50000&price<=200000` |
| Khoảng ngày | `createdAt>=2026-07-01&createdAt<=2026-07-31` |

Ví dụ lấy sách:

```http
GET /api/v1/books?current=1&pageSize=12&mainText=/react/i&price>=50000&sort=-sold
```

Riêng History, Reviews và Notifications có query DTO riêng, được mô tả tại từng module.

### Rate limit

Mặc định toàn hệ thống là 60 request/phút cho mỗi client. Một số endpoint có giới hạn thấp hơn hoặc cao hơn và được ghi trong cột “Ghi chú”.

## 3. Danh mục endpoint

### 3.1 Auth

Base path: `/api/v1/auth`

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/login` | Public | `{ email, password }` | `{ access_token, user }` | `loginAPI` |
| POST | `/register` | Public | `{ fullName, email, password, phone }` | User mới/chờ xác thực | `registerAPI` |
| GET | `/google` | Public | Không có | Chuyển hướng sang Google | gọi bằng `window.location.href` |
| GET | `/google/redirect` | Public | Google callback | Chuyển hướng về frontend với query `token` | App context nhận token |
| GET | `/account` | User | Bearer token | `{ user }` | `fetchAccountAPI` |
| GET | `/refresh` | Public | Cookie `refresh_token` | `{ access_token, user }` và cookie mới | Axios interceptor |
| POST | `/logout` | Public | Cookie `refresh_token` | `"ok"`; cookie bị xóa | `logoutAPI` |
| POST | `/verify-code` | Public | `{ _id, codeId }` | Kết quả kích hoạt | `verifyAPI` |
| POST | `/resend-code` | Public | `{ email }` | Kết quả gửi lại mã | `resendCodeAPI` |
| PATCH | `/change-password` | User | `{ oldPassword, newPassword }` | `{ access_token }` và cookie mới | `changePasswordAPI` |
| POST | `/forgot-password` | Public | `{ email }` | Kết quả gửi mã reset | `forgotPasswordAPI` |
| POST | `/reset-password` | Public | `{ email, codeId, newPassword, confirmPassword }` | Kết quả reset | `resetPasswordAPI` |

Giới hạn riêng:

- Login: 5 lần/phút.
- Register, resend code, forgot password: 3 lần/phút.
- Verify code, change password, reset password: 5 lần/phút.

Ví dụ login:

```bash
curl -X POST "http://localhost:8081/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@gmail.com","password":"123456"}'
```

Response:

```json
{
  "statusCode": 201,
  "message": "User login",
  "data": {
    "access_token": "<jwt>",
    "user": {
      "_id": "<mongo-id>",
      "email": "user@gmail.com",
      "fullName": "Nguyễn Văn An",
      "role": "USER",
      "phone": "0901234567",
      "avatar": "default-user.png"
    }
  }
}
```

### 3.2 Users

Base path: `/api/v1/users`

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/` | Admin | `{ fullName, email, password, phone, role }` | Tóm tắt user vừa tạo | `createUserAPI` |
| GET | `/?current=&pageSize=&...` | Admin | Query phân trang/AQP | `{ meta, result: User[] }` | `getUsersAPI` |
| GET | `/profile` | User | Không có | Profile hiện tại | `getProfileAPI` |
| PATCH | `/profile` | User | `{ fullName, phone, avatar? }` | Profile đã cập nhật | `updateProfileAPI` |
| GET | `/:id` | User | Path `id` | User theo ID | `getUserByIdAPI` |
| PATCH | `/:id` | Admin | `{ fullName, phone, avatar? }` | Kết quả cập nhật | `updateUserAPI` |
| DELETE | `/:id` | Admin | Path `id` | Kết quả soft delete | `deleteUserAPI` |

`PATCH` user không phải partial hoàn toàn: DTO hiện bắt buộc cả `fullName` và `phone`; chỉ `avatar` là optional.

User công khai cho client có dạng chính:

```ts
type User = {
  _id: string;
  email: string;
  phone: string;
  fullName: string;
  role: "USER" | "ADMIN";
  avatar: string;
  accountType?: "LOCAL" | "GOOGLE";
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
```

### 3.3 Books

Base path: `/api/v1/books`

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/` | Admin | `CreateBook` | `{ _id, createdAt }` | `createBookAPI` |
| GET | `/?current=&pageSize=&...` | Public | Query phân trang/AQP | `{ meta, result: Book[] }` | `getBooksAPI` |
| GET | `/:id` | Public | Path `id` | Book, có populate category | `getBookByIdAPI` |
| PATCH | `/:id` | Admin | Các field cần đổi của `CreateBook` | Kết quả cập nhật | `updateBookAPI` |
| DELETE | `/:id` | Admin | Path `id` | Kết quả soft delete | `deleteBookAPI` |

Body tạo sách:

```ts
type CreateBook = {
  mainText: string;
  author: string;
  price: number;       // >= 0
  quantity: number;    // >= 0
  category: string;    // MongoId của category
  thumbnail: string;
  slider: string[];    // ít nhất 1 phần tử
};
```

Book trả về cho React:

```ts
type Book = {
  _id: string;
  thumbnail: string;
  slider: string[];
  mainText: string;
  author: string;
  price: number;
  sold: number;
  quantity: number;
  category: {
    _id: string;
    name: string;
    slug?: string;
  };
  averageRating: number;
  reviewCount: number;
  ratingSummary: Record<1 | 2 | 3 | 4 | 5, number>;
  createdAt: string;
  updatedAt: string;
};
```

Tìm `mainText` được backend chuẩn hóa, loại một số từ đệm và tạo regex không phân biệt hoa thường. Kết quả luôn thêm sắp xếp phụ `_id: -1` để thứ tự ổn định.

### 3.4 Categories

Base path: `/api/v1/categories`

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/` | Admin | `{ name, slug?, description? }` | Category mới | `createCategoryAPI` |
| GET | `/` | Public | Không có `current/pageSize` | `Category[]`, sắp theo tên | `getCategoriesAPI` |
| GET | `/?current=&pageSize=&...` | Public | Query phân trang/AQP | `{ meta, result: Category[] }` | `getCategoriesAPI` |
| GET | `/deleted` | Admin | Không có | Category đã soft delete | `getDeletedCategoriesAPI` |
| GET | `/:id` | Public | Path `id` | Category theo ID | `getCategoryByIdAPI` |
| PATCH | `/:id` | Admin | `{ name?, slug?, description? }` | Kết quả cập nhật | `updateCategoryAPI` |
| PATCH | `/:id/restore` | Admin | Không có | Kết quả khôi phục | `restoreCategoryAPI` |
| DELETE | `/:id` | Admin | Path `id` | Kết quả soft delete | `deleteCategoryAPI` |

Kiểu trả về của `GET /categories` phụ thuộc query:

- Có đồng thời `current` và `pageSize`: object phân trang.
- Thiếu một trong hai: mảng category trực tiếp.

### 3.5 Files

Base path: `/api/v1/files`. Tất cả route hiện yêu cầu JWT nhưng chưa giới hạn role.

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/upload` | User | multipart field `file`; header `folder_type` | `{ fileUploaded, fileInfo }` | `uploadAvatarAPI` |
| POST | `/upload-multiple` | User | multipart fields `files`; header `folder_type` | `{ fileUploaded: string[], fileInfo }` | `uploadMultipleFileAPI` |
| POST | `/upload-review` | User | multipart fields `files`; header `folder_type: review` | Media review | `uploadReviewMediaAPI` |
| DELETE | `/cloudinary` | User | `{ publicId, type?: "IMAGE"/"VIDEO" }` | Kết quả Cloudinary destroy | Chưa có wrapper |
| DELETE | `/:fileName` | User | Header `folder_type: book/avatar` | `{ deleted, fileName }` | `deleteUploadedFileAPI` |
| GET | `/` | User | Không có | Health placeholder | Chưa dùng |
| GET | `/:id` | User | Numeric ID | Placeholder | Chưa dùng |
| PATCH | `/:id` | User | Body rỗng; `CreateFileDto` hiện chưa có field | Placeholder | Chưa dùng |

Quy tắc upload:

- Kích thước tối đa mỗi file: 50 MB.
- `folder_type=avatar`: chỉ ảnh và chỉ một file.
- `folder_type=book`: chỉ ảnh; endpoint multiple nhận tối đa 10 file.
- `folder_type=review`: ảnh hoặc video; tối đa 5 ảnh, 1 video và 6 file tổng cộng.
- Upload hiện lưu lên Cloudinary và trả URL đầy đủ.
- `DELETE /:fileName` chỉ xóa file local cũ trong `public/images/book` hoặc `public/images/avatar`. File Cloudinary phải xóa bằng `DELETE /files/cloudinary`.

Rate limit upload: single 10/phút; multiple 5/phút; review 5/phút.

### 3.6 Cart

Base path: `/api/v1/carts`. Tất cả route yêu cầu JWT.

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| GET | `/me` | User | Không có | Cart hiện tại; tự tạo cart rỗng nếu chưa có | `fetchMyCartAPI` |
| POST | `/items` | User | `{ bookId, quantity }` | Cart sau khi thêm | `addItemToCartAPI` |
| PATCH | `/items/:bookId` | User | `{ quantity }` | Cart sau cập nhật | `updateCartItemAPI` |
| DELETE | `/items/:bookId` | User | Path `bookId` | Cart sau khi xóa item | `removeCartItemAPI` |
| DELETE | `/clear` | User | Không có | Cart rỗng | `clearCartAPI` |

`quantity` phải là số nguyên từ 1 trở lên và không được vượt tồn kho. Muốn đưa quantity về 0 phải dùng DELETE.

```ts
type Cart = {
  _id: string;
  userId: string;
  items: Array<{
    bookId: {
      _id: string;
      mainText: string;
      thumbnail: string;
      price: number;
      quantity: number; // tồn kho hiện tại
    };
    quantity: number;
    priceAtAdd: number;
  }>;
  totalItems: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
};
```

Rate limit: thêm/xóa item 30/phút, đổi quantity 60/phút, clear cart 10/phút.

### 3.7 Wishlist

Base path: `/api/v1/wishlists`. Tất cả route yêu cầu JWT.

| Method | Path | Quyền | Request | Data logic | React |
|---|---|---|---|---|---|
| GET | `/me` | User | Không có | Wishlist, tự tạo rỗng nếu chưa có | `fetchMyWishlistAPI` |
| POST | `/:bookId` | User | Path `bookId` | Thêm nếu chưa tồn tại | `addBookToWishlistAPI` |
| DELETE | `/:bookId` | User | Path `bookId` | Bỏ sách khỏi wishlist | `removeBookFromWishlistAPI` |

Data wishlist:

```ts
type Wishlist = {
  _id: string;
  userId: string;
  bookIds: Book[];
  totalItems: number;
};
```

Controller Wishlist tự bọc `{ statusCode, message, data }`, sau đó global interceptor bọc thêm một lần. Response thực tế hiện là:

```json
{
  "statusCode": 200,
  "message": "",
  "data": {
    "statusCode": 200,
    "message": "Lấy danh sách yêu thích thành công",
    "data": {
      "_id": "...",
      "userId": "...",
      "bookIds": [],
      "totalItems": 0
    }
  }
}
```

Vì vậy frontend hiện đọc `res.data.data.bookIds` thay vì `res.data.bookIds`.

### 3.8 Orders

Base path: `/api/v1/orders`. Tất cả route yêu cầu JWT.

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/checkout` | User | `CheckoutDto` | Order vừa tạo | `checkoutAPI` |
| GET | `/?current=&pageSize=&...` | Admin | Query phân trang/AQP | Tất cả order | `getAllOrdersAPI` |
| GET | `/my?current=&pageSize=&...` | User | Query phân trang/AQP | Order của user hiện tại | `getMyOrdersAPI` |
| GET | `/:id` | Admin | Path `id` | Order theo ID | `getOrderByIdAPI` |
| PATCH | `/:id/status` | Admin | `{ status }` | Order sau cập nhật | `updateOrderStatusAPI` |
| PATCH | `/:id/cancel` | User | Không có | Order đã hủy | `cancelOrderAPI` |

Body checkout backend chấp nhận:

```ts
type CheckoutDto = {
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
  paymentMethod: "COD" | "VNPAY";
  note?: string;
  selectedBookIds?: string[]; // mỗi phần tử là MongoId
};
```

Nếu `selectedBookIds` không được gửi, backend checkout toàn bộ cart. Nếu có, chỉ các item tương ứng được tạo order và các item còn lại giữ trong cart.

Order:

```ts
type Order = {
  _id: string;
  orderCode: string;
  userId: string | {
    _id: string;
    fullName: string;
    email: string;
  };
  items: Array<{
    bookId: string;
    bookName: string;
    thumbnail: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "SHIPPING" | "COMPLETED" | "CANCELLED";
  paymentMethod: "COD" | "VNPAY";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  note?: string;
  createdAt: string;
  updatedAt: string;
};
```

Luồng trạng thái hợp lệ:

```text
PENDING ──> CONFIRMED ──> SHIPPING ──> COMPLETED
   │             │
   └─────────────┴──────> CANCELLED
```

- User chỉ tự hủy khi order còn `PENDING`.
- Admin có thể hủy từ `PENDING` hoặc `CONFIRMED`.
- Hủy order hoàn lại tồn kho và giảm số lượng đã bán.
- Order COD chuyển `COMPLETED` sẽ tự chuyển payment status từ `UNPAID` sang `PAID`.
- Checkout và cancel giới hạn 5 lần/phút.

### 3.9 History

Base path: `/api/v1/history`. Tất cả route yêu cầu JWT và chỉ trả order thuộc user hiện tại.

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| GET | `/` | User | Query `QueryHistoryDto` | Order `COMPLETED`/`CANCELLED` có phân trang | `getMyHistoryOrdersAPI` |
| GET | `/:id` | User | Path `id` | Order của chính user | `getHistoryOrderByIdAPI` / `getMyOrderByIdAPI` |

Query:

| Field | Kiểu | Mặc định/ràng buộc |
|---|---|---|
| `current` | integer | mặc định 1, tối thiểu 1 |
| `pageSize` | integer | mặc định 10, từ 1 đến 50 |
| `status` | enum | chỉ `COMPLETED` hoặc `CANCELLED` có tác dụng |
| `from` | ISO date | ngày bắt đầu |
| `to` | ISO date | tính đến 23:59:59.999 của ngày kết thúc |
| `orderCode` | string | tìm gần đúng, không phân biệt hoa thường |

### 3.10 Payments

Base path: `/api/v1/payments`

| Method | Path | Quyền thực tế | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/vnpay/create-payment-url/:orderId` | User | Path `orderId` | `{ paymentUrl, orderCode }` | `createVnpayPaymentUrlAPI` |
| GET | `/vnpay-return` | User | Toàn bộ query VNPay | `{ success, message, orderCode? }` | `verifyVnpayReturnAPI` |
| GET | `/vnpay-ipn` | User | Toàn bộ query VNPay | Kết quả IPN | Không gọi từ React |

Tạo URL thanh toán giới hạn 10 lần/phút.

Quan trọng: `vnpay-return` và `vnpay-ipn` không có `@Public()` nên JWT guard toàn cục đang bảo vệ cả hai. Request IPN từ máy chủ VNPay thường không có Bearer token và sẽ nhận `401` theo code hiện tại.

### 3.11 Dashboard

Base path: `/api/v1/dashboard`. Toàn bộ module chỉ dành cho Admin.

| Method | Path | Request | Data trả về | React |
|---|---|---|---|---|
| GET | `/summary` | Không có | Các tổng số hệ thống | `getDashboardSummaryAPI` |
| GET | `/latest-orders?limit=5` | `limit` từ 1 đến 20 sau khi clamp | Order mới nhất | `getLatestOrdersDashboardAPI` |
| GET | `/top-selling-books?limit=5` | `limit` từ 1 đến 20 sau khi clamp | Sách bán chạy | `getTopSellingBooksDashboardAPI` |
| GET | `/revenue-chart?type=month` | `type=day/month` | `{ label, revenue, orderCount }[]` | `getRevenueChartDashboardAPI` |

Summary:

```ts
type DashboardSummary = {
  totalUsers: number;
  totalBooks: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  paidOrders: number;
  completedOrders: number;
  cancelledOrders: number;
};
```

Doanh thu tính các order đã `PAID` hoặc `COMPLETED`.

### 3.12 Reviews

Base path: `/api/v1/reviews`

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/` | User | `CreateReviewDto` | Review mới | `createReviewAPI` |
| GET | `/book/:bookId/me` | User | Path `bookId` | Review của user cho sách | `getMyReviewsByBookAPI` |
| GET | `/book/:bookId` | Public | `QueryReviewDto` | List, meta và summary | `getReviewsByBookAPI` |
| GET | `/my-pending` | User | Không có | Sách trong order hoàn thành chưa review | `getMyPendingReviewsAPI` |
| PATCH | `/:id` | User/chủ review | `UpdateReviewDto` | Review sau cập nhật | `updateReviewAPI` |
| PATCH | `/:id/helpful` | User | Không có | Review với trạng thái helpful mới | `markReviewHelpfulAPI` |
| DELETE | `/:id` | User/chủ review | Path `id` | `{ deleted, _id }` | `deleteReviewAPI` |

Body tạo review:

```ts
type CreateReviewDto = {
  bookId: string;
  orderId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string; // tối đa 1500 ký tự
  media?: Array<{
    url: string;
    publicId?: string;
    type: "IMAGE" | "VIDEO";
  }>;
};
```

`orderId` là optional ở DTO nhưng schema lưu trữ bắt buộc; service sẽ xác định order hợp lệ từ lịch sử mua hàng nếu có thể. Mỗi sách trong một order chỉ được review một lần.

Query list review:

| Field | Kiểu/ràng buộc | Mặc định |
|---|---|---|
| `current` | integer >= 1 | 1 |
| `pageSize` | integer 1..50 | 5 |
| `rating` | integer 1..5 | tất cả |
| `hasMedia` | boolean | false/không lọc |
| `hasComment` | boolean | false/không lọc |
| `sort` | `newest`, `oldest`, `rating_desc`, `rating_asc` | `newest` |

Response `data` ngoài `meta` và `result` còn có:

```ts
type ReviewSummary = {
  averageRating: number;
  reviewCount: number;
  commentCount: number;
  mediaCount: number;
  ratingSummary: Record<1 | 2 | 3 | 4 | 5, number>;
};
```

Rate limit: tạo 5/phút, cập nhật 10/phút, helpful 30/phút.

### 3.13 Locations

Base path: `/api/v1/locations`

| Method | Path | Quyền | Data trả về | React |
|---|---|---|---|---|
| GET | `/provinces` | Public | `{ provinceCode, name, shortName, code, placeType }[]` | `getProvincesAPI` |
| GET | `/provinces/:provinceCode/wards` | Public | `{ wardCode, name, provinceCode }[]` | `getWardsByProvinceAPI` |

Location dùng dữ liệu tĩnh trong backend, không gọi dịch vụ địa chỉ bên ngoài.

### 3.14 Addresses

Base path: `/api/v1/addresses`. Toàn bộ route yêu cầu JWT. Backend đã có module nhưng React chưa có wrapper trong `src/services/api.ts`.

| Method | Path | Quyền | Request | Data trả về |
|---|---|---|---|---|
| GET | `/me` | User | Không có | Địa chỉ của user |
| POST | `/` | User | `CreateAddressDto` | Địa chỉ mới |
| PATCH | `/:id` | User/chủ địa chỉ | Field cần cập nhật | Địa chỉ đã cập nhật |
| PATCH | `/:id/default` | User/chủ địa chỉ | Không có | Địa chỉ mặc định mới |
| DELETE | `/:id` | User/chủ địa chỉ | Path `id` | Kết quả xóa |

```ts
type CreateAddressDto = {
  fullName: string;
  phone: string;         // đúng 10 chữ số
  provinceCode: string;
  wardCode: string;
  addressLine: string;
  isDefault?: boolean;
};
```

Backend kiểm tra ward có thuộc province đã chọn, sau đó tự lưu thêm `provinceName`, `wardName` và `fullAddress`.

Rate limit: tạo/xóa 10/phút; cập nhật/đặt mặc định 20/phút.

### 3.15 Notifications

Base path: `/api/v1/notifications`. Tất cả route yêu cầu JWT.

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| GET | `/my?current=1&pageSize=10&isRead=false` | User | Phân trang; `isRead=true/false` optional | Notification có phân trang | `getMyNotificationsAPI` |
| GET | `/unread-count` | User | Không có | `{ total }` | `getUnreadNotificationCountAPI` |
| PATCH | `/:id/read` | User/chủ notification | Path `id` | Notification đã đọc | `markNotificationReadAPI` |
| PATCH | `/read-all` | User | Không có | `{ success }` | `markAllNotificationsReadAPI` |

Notification type hiện có:

- `ORDER_STATUS`
- `PAYMENT_SUCCESS`

#### Socket.IO realtime

Kết nối:

```ts
io("http://localhost:8081/notifications", {
  auth: { token: accessToken },
  transports: ["websocket"],
  withCredentials: true
});
```

Backend cũng nhận token từ header `Authorization: Bearer ...`. Socket không có token hợp lệ sẽ bị disconnect.

| Event server phát | Người nhận | Payload |
|---|---|---|
| `notification:new` | User cụ thể | `{ notification, unreadCount }` |
| `notification:unread-count` | User cụ thể | `{ unreadCount }` |
| `admin:order:new` | Admin room | `{ order }` |
| `admin:order:updated` | Admin room | `{ order }` |

Frontend chuyển các socket event thành browser `CustomEvent` cùng tên để component khác lắng nghe.

### 3.16 Chatbot

Base path: `/api/v1/chatbot`

| Method | Path | Quyền | Request | Data trả về | React |
|---|---|---|---|---|---|
| POST | `/chat` | Public | `{ message, history? }` | `{ response }` | `sendChatMessageAPI` |

```ts
type ChatRequest = {
  message: string;
  history?: Array<{
    role: "user" | "model";
    text: string;
  }>;
};
```

### 3.17 Health, mail test và placeholder

| Method | Path | Quyền | Trạng thái |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Trả `{ status: "ok" }` trong success envelope chuẩn |
| GET | `/api/v1/mail` | Public | Endpoint test, gửi email tới địa chỉ hard-code; 3 lần/phút |

`AppController` chỉ cung cấp health check; `DatabasesController` không khai báo HTTP handler. Các route Files `GET /`, `GET /:id`, `PATCH /:id` chỉ là placeholder và chưa kết nối persistence. Do ValidationPipe cấm field ngoài DTO, body có field bất kỳ gửi tới `PATCH /files/:id` sẽ bị từ chối ở trạng thái hiện tại.

Không nên bật `GET /mail` công khai trong production.

## 4. Nhóm Voucher chỉ tồn tại ở React

React đã khai báo và sử dụng các API sau:

| Method | Path frontend gọi | Hàm React |
|---|---|---|
| POST | `/vouchers/validate` | `validateVoucherAPI` |
| GET | `/vouchers/client` | `getClientVouchersAPI` |
| GET | `/vouchers` | `getVouchersAPI` |
| POST | `/vouchers` | `createVoucherAPI` |
| PATCH | `/vouchers/:id` | `updateVoucherAPI` |
| DELETE | `/vouchers/:id` | `deleteVoucherAPI` |

Payload frontend đang kỳ vọng cho voucher:

```ts
type VoucherInput = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscountValue?: number;
  minOrderValue?: number;
  usageLimit?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
};
```

Tuy nhiên `backend-for-react-ts` hiện:

- Không có `VouchersModule`, controller, service, schema hoặc route `/vouchers`.
- Không import module Voucher trong `AppModule`.
- `CheckoutDto` không khai báo `voucherCode`.
- `Order` schema không có `originalPrice`, `discount` hoặc `voucherCode`.

Do `forbidNonWhitelisted: true`, khi React áp voucher rồi gửi `voucherCode` trong `POST /orders/checkout`, backend sẽ trả HTTP `400` với lỗi field không được phép. Toàn bộ màn hình voucher hiện chưa thể hoạt động với backend chính.

## 5. Ma trận đối chiếu React và backend

| Nhóm | React → Backend | Trạng thái |
|---|---|---|
| Auth | Khớp route chính | Hoạt động; có auto refresh 419 |
| Users | Khớp route | Cần chú ý update bắt buộc fullName + phone |
| Books | Khớp route | Kiểu TS của response create rộng hơn data thực tế |
| Categories | Khớp route | GET có hai dạng data: mảng hoặc paginate |
| Files | Upload khớp | Xóa local và xóa Cloudinary là hai API khác nhau |
| Cart | Khớp route | Có kiểm tra tồn kho |
| Wishlist | Khớp route | Response đang bị bọc hai lớp |
| Orders | Khớp nếu không dùng voucher | `voucherCode` làm checkout lỗi 400 |
| History | Khớp route | Chỉ COMPLETED/CANCELLED |
| Payments | React gọi create/return | IPN và return đang bị JWT guard |
| Dashboard | Khớp route | Admin only |
| Reviews | Khớp route | Upload media nằm trong Files |
| Locations | Khớp route | Public |
| Addresses | Chỉ có ở backend | React chưa có wrapper |
| Notifications | REST + socket khớp | Token gửi qua socket auth |
| Chatbot | Khớp route | Public |
| Vouchers | Chỉ có ở React | Backend chưa triển khai |

## 6. Các điểm cần sửa trước khi coi contract ổn định

### Mức ưu tiên cao

1. Triển khai Voucher trong backend hoặc tạm gỡ Voucher khỏi checkout React. Nếu triển khai, cần thêm DTO, schema, module, controller, tính discount ở server và snapshot discount vào Order.
2. Đánh dấu `vnpay-ipn` là Public và tự xác thực bằng secure hash của VNPay; không dùng JWT cho callback server-to-server.
3. Chuẩn hóa Wishlist để controller trả trực tiếp data, cho global interceptor bọc đúng một lần.
4. Sửa Axios error interceptor để lỗi thật sự reject, hoặc thống nhất toàn bộ call site luôn kiểm tra `res.error`.

### Mức ưu tiên vừa

1. Thêm wrapper React cho Addresses nếu muốn lưu nhiều địa chỉ; checkout hiện chỉ ghép địa chỉ từ form.
2. Thêm wrapper xóa Cloudinary và dùng `publicId` cho ảnh/video mới upload.
3. Sửa type `IBackendRes<T>` để `error` là optional, vì success response không có field này.
4. Tách kiểu `getCategoriesAPI` thành response mảng và response phân trang.
5. Sửa generic response của `createUserAPI` và `createBookAPI` theo đúng data backend thực trả.
6. Xóa hoặc khóa endpoint test `GET /mail` trước khi deploy.

## 7. Checklist thêm API mới

Khi thêm một endpoint, cập nhật đồng thời:

1. Backend DTO với validation đầy đủ.
2. Controller: method, path, `@Public()`/`@Roles()` và `@ResponseMessage()`.
3. Service và schema/persistence.
4. Kiểu dữ liệu React trong `src/types/global.d.ts`.
5. Wrapper Axios trong `src/services/api.ts`.
6. Xử lý success envelope và error envelope.
7. Unit/contract test cho DTO, quyền và response thay đổi.
8. Integration test nếu endpoint có persistence, transaction hoặc state transition.
9. Swagger decorator nếu endpoint cần xuất hiện rõ trong Swagger.
10. Tài liệu này, `TESTING.md` và ma trận chênh lệch React/backend.

## 8. Ví dụ luồng checkout không dùng voucher

1. Lấy cart:

```http
GET /api/v1/carts/me
Authorization: Bearer <access_token>
```

2. Tạo order:

```bash
curl -X POST "http://localhost:8081/api/v1/orders/checkout" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "fullName": "Nguyễn Văn An",
      "phone": "0901234567",
      "address": "12 Nguyễn Văn Bảo, Phường Hạnh Thông, TP. Hồ Chí Minh"
    },
    "paymentMethod": "COD",
    "note": "Giao giờ hành chính",
    "selectedBookIds": ["667a1c2b3d4e5f6789012345"]
  }'
```

3. Nếu dùng VNPay, lấy URL sau khi order được tạo:

```http
POST /api/v1/payments/vnpay/create-payment-url/<orderId>
Authorization: Bearer <access_token>
```

4. Frontend chuyển trình duyệt tới `data.paymentUrl`.

Không gửi `voucherCode` cho đến khi backend chính có contract Voucher tương ứng.
