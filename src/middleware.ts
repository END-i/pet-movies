import { defineMiddleware } from 'astro:middleware';
import { clientKey, createRateLimiter } from './lib/rateLimit';

// 40-request burst, then 1 request per second per client; protects the TMDB key quota.
const apiLimiter = createRateLimiter({ capacity: 40, refillPerSecond: 1 });

// No CSP yet: Astro islands and the theme script are inline, so it would need 'unsafe-inline'.
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

function withSecurityHeaders(response: Response): Response {
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!response.headers.has(name)) response.headers.set(name, value);
    }
  } catch {
    // Immutable headers (e.g. Response.redirect): leave that response as it is.
  }
  return response;
}

/**
 * SSR pages are always revalidated, so a deploy shows up at once; `/_astro/*` assets are
 * content-hashed and cached for a year by the adapter, API routes set their own max-age.
 */
function withPageCaching(response: Response): Response {
  try {
    const isHtml = response.headers.get('Content-Type')?.includes('text/html');
    if (isHtml && !response.headers.has('Cache-Control')) {
      response.headers.set('Cache-Control', 'no-cache');
    }
  } catch {
    // Immutable headers: keep the response unchanged.
  }
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) return next();
  if (!context.url.pathname.startsWith('/api/'))
    return withPageCaching(withSecurityHeaders(await next()));

  let socketAddress: string | undefined;
  try {
    socketAddress = context.clientAddress;
  } catch {
    socketAddress = undefined;
  }

  const result = apiLimiter.take(clientKey(context.request.headers, socketAddress));
  if (result.allowed) return withSecurityHeaders(await next());

  return new Response(JSON.stringify({ error: 'Забагато запитів. Спробуйте за хвилину.' }), {
    status: 429,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfter)
    }
  });
});
