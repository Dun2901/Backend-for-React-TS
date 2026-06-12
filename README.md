# BookStore Backend

Backend cho website bán sách, xây dựng bằng **NestJS**, **MongoDB**, **JWT**, **Google OAuth**, **VNPay Sandbox** và **Cloudinary**.

## Công nghệ sử dụng

- NestJS
- MongoDB + Mongoose
- JWT Authentication
- Google OAuth
- Nodemailer
- VNPay Sandbox
- Cloudinary
- TypeScript

---

## Cài đặt dự án

```bash
# 1. Clone project
git clone https://github.com/Dun2901/Backend-for-React-TS.git

# 2. Di chuyển vào thư mục dự án
cd Backend-for-React-TS

# 3. Cài dependencies
npm install

# 4. Tạo file môi trường
cp .env.example .env

# 5. Chạy dự án
npm run dev
```

Server mặc định chạy tại:

```text
http://localhost:8081
```

---

## File `.env.example`

```env
PORT=8081
MONGODB_URL=

# JWT
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRE=15m

JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRE=7d

# Seed data
SHOULD_INIT=true
INIT_PASSWORD=123456

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=
MAIL_PASS=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8081/api/v1/auth/google/redirect

# VNPay Sandbox
VNPAY_TMN_CODE=
VNPAY_SECURE_SECRET=
VNPAY_URL=
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay-return
VNPAY_IPN_URL=http://localhost:8081/api/v1/payments/vnpay-ipn
VNPAY_TEST_MODE=true

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

CLOUDINARY_AVATAR_FOLDER=bookstore/avatar
CLOUDINARY_BOOK_FOLDER=bookstore/books
CLOUDINARY_REVIEW_FOLDER=bookstore/reviews
CLOUDINARY_ROOT_FOLDER=bookstore
```

---

## Giải thích biến môi trường quan trọng

### Server

| Biến          | Ý nghĩa                                |
| ------------- | -------------------------------------- |
| `PORT`        | Cổng chạy backend. Mặc định là `8081`. |
| `MONGODB_URL` | Connection string để kết nối MongoDB.  |

Ví dụ MongoDB local:

```env
MONGODB_URL=mongodb://localhost:27017/bookstore
```

Ví dụ MongoDB Atlas:

```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/bookstore
```

---

### JWT

| Biến                 | Ý nghĩa                                       |
| -------------------- | --------------------------------------------- |
| `JWT_ACCESS_SECRET`  | Secret dùng để ký access token.               |
| `JWT_ACCESS_EXPIRE`  | Thời gian sống của access token, ví dụ `15m`. |
| `JWT_REFRESH_SECRET` | Secret dùng để ký refresh token.              |
| `JWT_REFRESH_EXPIRE` | Thời gian sống của refresh token, ví dụ `7d`. |

Ví dụ:

```env
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
```

Nên đặt `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` là chuỗi dài, khó đoán.

---

### Seed data

| Biến            | Ý nghĩa                                                 |
| --------------- | ------------------------------------------------------- |
| `SHOULD_INIT`   | `true` nếu muốn tự động tạo dữ liệu mẫu khi chạy dự án. |
| `INIT_PASSWORD` | Mật khẩu mặc định cho các tài khoản được seed.          |

Ví dụ:

```env
SHOULD_INIT=true
INIT_PASSWORD=123456
```

Sau khi seed xong, có thể đổi:

```env
SHOULD_INIT=false
```

để tránh tạo lại dữ liệu mẫu.

---

### Email

| Biến        | Ý nghĩa                                 |
| ----------- | --------------------------------------- |
| `MAIL_HOST` | SMTP host dùng để gửi mail.             |
| `MAIL_PORT` | SMTP port. Với Gmail thường dùng `465`. |
| `MAIL_USER` | Email dùng để gửi mã xác thực.          |
| `MAIL_PASS` | App Password của Gmail.                 |

Nếu dùng Gmail, cần tạo **App Password**, không dùng mật khẩu đăng nhập Gmail thường.

Ví dụ:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
```

---

### Google OAuth

| Biến                  | Ý nghĩa                                             |
| --------------------- | --------------------------------------------------- |
| `GOOGLE_CLIENT_ID`    | Client ID lấy từ Google Cloud Console.              |
| `GOOGLE_SECRET`       | Client Secret lấy từ Google Cloud Console.          |
| `GOOGLE_REDIRECT_URL` | URL backend nhận callback sau khi đăng nhập Google. |

Khi chạy local, thường để:

```env
GOOGLE_REDIRECT_URL=http://localhost:8081/api/v1/auth/google/redirect
```

URL này phải khớp với phần **Authorized redirect URIs** trong Google Cloud Console.

---

### VNPay Sandbox

| Biến                  | Ý nghĩa                                       |
| --------------------- | --------------------------------------------- |
| `VNPAY_TMN_CODE`      | Mã website do VNPay Sandbox cấp.              |
| `VNPAY_SECURE_SECRET` | Secret key do VNPay Sandbox cấp.              |
| `VNPAY_URL`           | URL thanh toán sandbox của VNPay.             |
| `VNPAY_RETURN_URL`    | URL frontend nhận kết quả sau khi thanh toán. |
| `VNPAY_IPN_URL`       | URL backend nhận IPN từ VNPay.                |
| `VNPAY_TEST_MODE`     | `true` nếu đang dùng môi trường test.         |

Ví dụ khi chạy local:

```env
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay-return
VNPAY_IPN_URL=http://localhost:8081/api/v1/payments/vnpay-ipn
VNPAY_TEST_MODE=true
```

Lưu ý: `VNPAY_RETURN_URL` là URL của frontend, còn `VNPAY_IPN_URL` là URL của backend.

---

### Cloudinary

| Biến                       | Ý nghĩa                                  |
| -------------------------- | ---------------------------------------- |
| `CLOUDINARY_CLOUD_NAME`    | Cloud name trong tài khoản Cloudinary.   |
| `CLOUDINARY_API_KEY`       | API key của Cloudinary.                  |
| `CLOUDINARY_API_SECRET`    | API secret của Cloudinary.               |
| `CLOUDINARY_AVATAR_FOLDER` | Thư mục lưu ảnh avatar.                  |
| `CLOUDINARY_BOOK_FOLDER`   | Thư mục lưu ảnh sách.                    |
| `CLOUDINARY_REVIEW_FOLDER` | Thư mục lưu ảnh đánh giá.                |
| `CLOUDINARY_ROOT_FOLDER`   | Thư mục gốc của project trên Cloudinary. |

Ví dụ:

```env
CLOUDINARY_AVATAR_FOLDER=bookstore/avatar
CLOUDINARY_BOOK_FOLDER=bookstore/books
CLOUDINARY_REVIEW_FOLDER=bookstore/reviews
CLOUDINARY_ROOT_FOLDER=bookstore
```

---

## Ghi chú khi chạy dự án

- Đảm bảo MongoDB đang chạy hoặc `MONGODB_URL` đã trỏ đúng đến MongoDB Atlas.
- Nếu dùng đăng nhập Google, cần cấu hình đúng `GOOGLE_REDIRECT_URL`.
- Nếu dùng thanh toán VNPay, cần điền đầy đủ thông tin sandbox.
- Nếu upload ảnh, cần cấu hình Cloudinary.
- Không commit file `.env` lên GitHub.

---

## Scripts

```bash
# Chạy dev
npm run dev
```
