/// <reference types="jest" />

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  it('wraps data with status code and response message', async () => {
    const handler = jest.fn();
    const reflector = {
      get: jest.fn().mockReturnValue('Tạo thành công'),
    } as unknown as Reflector;
    const context = {
      getHandler: () => handler,
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 201 }),
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of({ id: 'book-1' }),
    } as CallHandler;

    const result = await firstValueFrom(
      new TransformInterceptor(reflector).intercept(context, next),
    );

    expect(result).toEqual({
      statusCode: 201,
      message: 'Tạo thành công',
      data: { id: 'book-1' },
    });
  });

  it('uses an empty message when the handler has no metadata', async () => {
    const reflector = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const context = {
      getHandler: () => jest.fn(),
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of(['book']) } as CallHandler;

    await expect(
      firstValueFrom(new TransformInterceptor(reflector).intercept(context, next)),
    ).resolves.toEqual({
      statusCode: 200,
      message: '',
      data: ['book'],
    });
  });
});
