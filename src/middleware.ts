import { defineMiddleware } from 'astro:middleware';
import { clientKey, createRateLimiter } from './lib/rateLimit';

// 40-request burst, then 1 request per second per client; protects the TMDB key quota.
const apiLimiter = createRateLimiter({ capacity: 40, refillPerSecond: 1 });

export const onRequest = defineMiddleware((context, next) => {
  if (!context.url.pathname.startsWith('/api/') || context.isPrerendered) return next();

  let socketAddress: string | undefined;
  try {
    socketAddress = context.clientAddress;
  } catch {
    socketAddress = undefined;
  }

  const result = apiLimiter.take(clientKey(context.request.headers, socketAddress));
  if (result.allowed) return next();

  return new Response(JSON.stringify({ error: 'Забагато запитів. Спробуйте за хвилину.' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfter)
    }
  });
});
