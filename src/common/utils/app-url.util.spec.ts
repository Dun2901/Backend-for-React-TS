/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import {
  buildClientRedirectUrl,
  getClientUrl,
  getGoogleRedirectUrl,
  getServerUrl,
  getVnpayIpnUrl,
  getVnpayReturnUrl,
} from './app-url.util';

const createConfig = (values: Partial<IConfigService> = {}) => {
  return new ConfigService<IConfigService>(values);
};

describe('app URL utilities', () => {
  it('uses local defaults and removes trailing slashes', () => {
    expect(getClientUrl(createConfig())).toBe('http://localhost:3000');
    expect(getServerUrl(createConfig())).toBe('http://localhost:8081');
    expect(getClientUrl(createConfig({ CLIENT_URL: 'http://client.local///' }))).toBe(
      'http://client.local',
    );
  });

  it('builds provider callback URLs from the configured origins', () => {
    const config = createConfig({
      CLIENT_URL: 'https://shop.example.com/',
      SERVER_URL: 'https://api.example.com/',
    });

    expect(getGoogleRedirectUrl(config)).toBe(
      'https://api.example.com/api/v1/auth/google/redirect',
    );
    expect(getVnpayReturnUrl(config)).toBe('https://shop.example.com/payment/vnpay-return');
    expect(getVnpayIpnUrl(config)).toBe('https://api.example.com/api/v1/payments/vnpay-ipn');
  });

  it('prefers explicit provider callback URLs', () => {
    const config = createConfig({
      GOOGLE_REDIRECT_URL: 'https://callbacks.example.com/google',
      VNPAY_RETURN_URL: 'https://callbacks.example.com/vnpay-return',
      VNPAY_IPN_URL: 'https://callbacks.example.com/vnpay-ipn',
    });

    expect(getGoogleRedirectUrl(config)).toBe('https://callbacks.example.com/google');
    expect(getVnpayReturnUrl(config)).toBe('https://callbacks.example.com/vnpay-return');
    expect(getVnpayIpnUrl(config)).toBe('https://callbacks.example.com/vnpay-ipn');
  });

  it('builds an encoded client redirect URL', () => {
    const result = buildClientRedirectUrl(createConfig(), '/payment/result', {
      orderId: 'order-123',
      message: 'Thanh toán thành công',
    });
    const url = new URL(result);

    expect(url.origin).toBe('http://localhost:3000');
    expect(url.pathname).toBe('/payment/result');
    expect(url.searchParams.get('orderId')).toBe('order-123');
    expect(url.searchParams.get('message')).toBe('Thanh toán thành công');
  });
});
