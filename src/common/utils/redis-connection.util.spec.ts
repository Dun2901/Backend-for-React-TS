/// <reference types="jest" />

import { parseRedisConnection } from './redis-connection.util';

describe('parseRedisConnection', () => {
  it('parses a standard Redis URL', () => {
    expect(parseRedisConnection('redis://queue-user:secret@redis.local:6380')).toEqual({
      host: 'redis.local',
      port: 6380,
      username: 'queue-user',
      password: 'secret',
      tls: undefined,
    });
  });

  it('uses the default Redis port and omits empty credentials', () => {
    expect(parseRedisConnection('redis://127.0.0.1')).toEqual({
      host: '127.0.0.1',
      port: 6379,
      username: undefined,
      password: undefined,
      tls: undefined,
    });
  });

  it('enables TLS for rediss URLs', () => {
    expect(parseRedisConnection('rediss://redis.example.com:6380').tls).toEqual({});
  });

  it('rejects malformed URLs', () => {
    expect(() => parseRedisConnection('not-a-url')).toThrow();
  });
});
