/// <reference types="jest" />

import 'reflect-metadata';
import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { PaymentMethod } from '../schemas/order.schema';
import { CheckoutDto } from './checkout.dto';

const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: CheckoutDto,
};

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const validCheckout = {
  shippingAddress: {
    fullName: 'Nguyễn Văn An',
    phone: '0901234567',
    address: '12 Nguyễn Văn Bảo, TP. Hồ Chí Minh',
  },
  paymentMethod: PaymentMethod.COD,
  selectedBookIds: ['667a1c2b3d4e5f6789012345'],
};

describe('CheckoutDto contract', () => {
  it('accepts a valid checkout payload', async () => {
    const result = (await pipe.transform(validCheckout, metadata)) as CheckoutDto;

    expect(result).toBeInstanceOf(CheckoutDto);
    expect(result.shippingAddress.fullName).toBe('Nguyễn Văn An');
  });

  it('requires the shipping address', async () => {
    const payload = {
      paymentMethod: validCheckout.paymentMethod,
      selectedBookIds: validCheckout.selectedBookIds,
    };

    await expect(pipe.transform(payload, metadata)).rejects.toThrow();
  });

  it('rejects an invalid payment method', async () => {
    await expect(
      pipe.transform({ ...validCheckout, paymentMethod: 'CASH' }, metadata),
    ).rejects.toThrow();
  });

  it('rejects invalid selected book IDs', async () => {
    await expect(
      pipe.transform({ ...validCheckout, selectedBookIds: ['not-a-mongo-id'] }, metadata),
    ).rejects.toThrow();
  });

  it('rejects fields that are not part of the backend contract', async () => {
    await expect(
      pipe.transform({ ...validCheckout, voucherCode: 'SUMMER2026' }, metadata),
    ).rejects.toThrow();
  });
});
