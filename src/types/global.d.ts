export {};

declare global {
  interface IConfigService {
    PORT?: number;
    MONGODB_URL?: string;

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
  }

  interface IUser {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    phone: string;
    avatar: string;
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
