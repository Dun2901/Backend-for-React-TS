/// <reference types="jest" />

import { BadRequestException, HttpStatus } from '@nestjs/common';
import { getErrorMessage, getStatusCode } from './all-exception.filter';

describe('global exception helpers', () => {
  it('gets the status and message from an HttpException', () => {
    const exception = new BadRequestException('Payload không hợp lệ');

    expect(getStatusCode(exception)).toBe(HttpStatus.BAD_REQUEST);
    expect(getErrorMessage(exception)).toBe('Payload không hợp lệ');
  });

  it('preserves validation message arrays', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['email phải hợp lệ', 'password không được để trống'],
      error: 'Bad Request',
    });

    expect(getErrorMessage(exception)).toEqual([
      'email phải hợp lệ',
      'password không được để trống',
    ]);
  });

  it('maps unknown exceptions to HTTP 500 and a string message', () => {
    const exception = new Error('MongoDB unavailable');

    expect(getStatusCode(exception)).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(getErrorMessage(exception)).toBe('Error: MongoDB unavailable');
  });
});
