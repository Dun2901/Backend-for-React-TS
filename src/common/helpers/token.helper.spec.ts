/// <reference types="jest" />

import { compareToken, hashToken } from './token.helper';

describe('token helpers', () => {
  it('hashes a token and validates the original value', async () => {
    const hashedToken = await hashToken('refresh-token');

    expect(hashedToken).not.toBe('refresh-token');
    await expect(compareToken('refresh-token', hashedToken)).resolves.toBe(true);
  });

  it('rejects a different token', async () => {
    const hashedToken = await hashToken('refresh-token');

    await expect(compareToken('another-token', hashedToken)).resolves.toBe(false);
  });
});
