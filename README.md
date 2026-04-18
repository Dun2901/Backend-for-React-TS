<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
# 1. Clone
git clone https://github.com/Dun2901/Backend-for-React-TS.git
cd Backend-for-React-TS

# 2. Install dependencies
npm install

# 3. Copy env
cp .env.example .env
# Edit .env xem ở phần giải thích

# 4. Chạy dự án
npm run dev
```

### `.env.example` File Template

```text
# Server config
PORT=8081
MONGODB_URL=

# Config JWT
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRE=

JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRE=

# Init sample data
SHOULD_INIT=true
INIT_PASSWORD=

# Config EMAIL
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=
MAIL_PASS=
```

### Giải thích các biến môi trường

**Server**

- `PORT` — Cổng chạy server (mặc định `8081`)
- `MONGODB_URL` — Connection string MongoDB, ví dụ: `mongodb://localhost:27017/mydb`

**JWT**

- `JWT_ACCESS_SECRET` — Chuỗi bí mật để ký access token (đặt càng dài càng an toàn)
- `JWT_ACCESS_EXPIRE` — Thời hạn access token, ví dụ: `15m`
- `JWT_REFRESH_SECRET` — Chuỗi bí mật để ký refresh token
- `JWT_REFRESH_EXPIRE` — Thời hạn refresh token, ví dụ: `7d`

**Init sample data**

- `SHOULD_INIT` — `true` nếu muốn seed dữ liệu mẫu lúc khởi động, `false` nếu không
- `INIT_PASSWORD` — Password mặc định cho các tài khoản được seed đặt là 123456 đều được

**Email**

- `MAIL_HOST` — SMTP host (mặc định Gmail: `smtp.gmail.com`)
- `MAIL_PORT` — SMTP port (mặc định Gmail: `465`)
- `MAIL_USER` — Gmail dùng để gửi mail
- `MAIL_PASS` — App Password của Gmail ([hướng dẫn tạo](https://myaccount.google.com/apppasswords))
