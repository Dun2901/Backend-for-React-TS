import { UserRoles } from '@/common/enums';

export {};

declare global {
  interface IConfigService {
    PORT?: number;
    MONGODB_URL?: string;

    CLIENT_URL?: string;
    SERVER_URL?: string;

    JWT_ACCESS_SECRET?: string;
    JWT_ACCESS_EXPIRE?: string | number;
    JWT_REFRESH_SECRET?: string;
    JWT_REFRESH_EXPIRE?: string | number;

    SHOULD_INIT?: string;
    INIT_PASSWORD?: string;

    MAIL_HOST?: string;
    MAIL_PORT?: number;
    MAIL_USER?: string;
    MAIL_PASS?: string;

    GOOGLE_CLIENT_ID?: string;
    GOOGLE_SECRET?: string;
    GOOGLE_REDIRECT_URL?: string;

    VNPAY_TMN_CODE?: string;
    VNPAY_SECURE_SECRET?: string;

    VNPAY_URL?: string;
    VNPAY_RETURN_URL?: string;
    VNPAY_IPN_URL?: string;
    VNPAY_TEST_MODE?: boolean;

    CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
    CLOUDINARY_AVATAR_FOLDER?: string;
    CLOUDINARY_BOOK_FOLDER?: string;
    CLOUDINARY_REVIEW_FOLDER?: string;
    CLOUDINARY_ROOT_FOLDER?: string;
  }

  interface IUser {
    _id: string;
    fullName: string;
    email: string;
    role: UserRoles;
    phone: string;
    avatar: string;
  }

  interface IJwtPayload {
    sub: string;
    iss: string;
    _id: string;
    fullName: string;
    email: string;
    role: string;
    avatar: string;
    tokenVersion: number;
  }

  interface IGoogleUser {
    fullName: string;
    email: string;
    avatar: string;
    accessToken?: string;
    refreshToken?: string;
  }

  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
