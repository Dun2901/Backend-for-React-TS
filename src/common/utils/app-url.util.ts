import { ConfigService } from '@nestjs/config';

const removeTrailingSlash = (url: string) => {
  return url.replace(/\/+$/, '');
};

const buildUrl = (baseUrl: string, path: string) => {
  const cleanBaseUrl = removeTrailingSlash(baseUrl);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBaseUrl}${cleanPath}`;
};

export const getClientUrl = (configService: ConfigService<IConfigService>) => {
  return removeTrailingSlash(configService.get<string>('CLIENT_URL') || 'http://localhost:3000');
};

export const getServerUrl = (configService: ConfigService<IConfigService>) => {
  return removeTrailingSlash(configService.get<string>('SERVER_URL') || 'http://localhost:8081');
};

export const getGoogleRedirectUrl = (configService: ConfigService<IConfigService>) => {
  return (
    configService.get<string>('GOOGLE_REDIRECT_URL') ||
    buildUrl(getServerUrl(configService), '/api/v1/auth/google/redirect')
  );
};

export const getVnpayReturnUrl = (configService: ConfigService<IConfigService>) => {
  return (
    configService.get<string>('VNPAY_RETURN_URL') ||
    buildUrl(getClientUrl(configService), '/payment/vnpay-return')
  );
};

export const getVnpayIpnUrl = (configService: ConfigService<IConfigService>) => {
  return (
    configService.get<string>('VNPAY_IPN_URL') ||
    buildUrl(getServerUrl(configService), '/api/v1/payments/vnpay-ipn')
  );
};

export const buildClientRedirectUrl = (
  configService: ConfigService<IConfigService>,
  path: string,
  query?: Record<string, string>,
) => {
  const url = new URL(buildUrl(getClientUrl(configService), path));

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
};
