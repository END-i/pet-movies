import { describe, expect, it, vi } from 'vitest';
import { createTtlCache } from '../../src/lib/cache';
import { clientKey, createRateLimiter } from '../../src/lib/rateLimit';

function clock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe('createTtlCache', () => {
  it('expires entries after their TTL', () => {
    const time = clock();
    const cache = createTtlCache<string>({ maxEntries: 10, ttlMs: 1000, now: time.now });
    cache.set('a', 'value');
    time.advance(999);
    expect(cache.get('a')).toBe('value');
    time.advance(1);
    expect(cache.get('a')).toBeUndefined();
  });

  it('evicts the least recently used entry', () => {
    const cache = createTtlCache<number>({ maxEntries: 2, ttlMs: 1000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(2);
  });

  it('shares one load between concurrent callers', async () => {
    const cache = createTtlCache<string>({ maxEntries: 10, ttlMs: 1000 });
    const load = vi.fn(async () => 'loaded');
    const results = await Promise.all([
      cache.getOrLoad('k', load),
      cache.getOrLoad('k', load),
      cache.getOrLoad('k', load)
    ]);
    expect(results).toEqual(['loaded', 'loaded', 'loaded']);
    expect(load).toHaveBeenCalledTimes(1);
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const cache = createTtlCache<string>({ maxEntries: 10, ttlMs: 1000 });
    await expect(cache.getOrLoad('k', () => Promise.reject(new Error('boom')))).rejects.toThrow(
      'boom'
    );
    await expect(cache.getOrLoad('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('skips caching when TTL is 0', async () => {
    const cache = createTtlCache<string>({ maxEntries: 10, ttlMs: 1000 });
    await cache.getOrLoad('k', async () => 'once', 0);
    expect(cache.get('k')).toBeUndefined();
  });
});

describe('createRateLimiter', () => {
  it('allows a burst, then refills over time', () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 3, refillPerSecond: 1, now: time.now });
    expect([1, 2, 3].map(() => limiter.take('ip').allowed)).toEqual([true, true, true]);
    expect(limiter.take('ip')).toEqual({ allowed: false, retryAfter: 1 });
    time.advance(1000);
    expect(limiter.take('ip').allowed).toBe(true);
  });

  it('tracks clients separately', () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1 });
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
    expect(limiter.take('b').allowed).toBe(true);
  });
});

describe('clientKey', () => {
  it('uses the hop added by our proxy, not one the client could spoof', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.7' });
    expect(clientKey(headers, '10.0.0.1')).toBe('203.0.113.7');
  });

  it('falls back to the socket address', () => {
    expect(clientKey(new Headers(), '198.51.100.2')).toBe('198.51.100.2');
    expect(clientKey(new Headers(), undefined)).toBe('unknown');
  });
});
