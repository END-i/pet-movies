import { describe, expect, it } from 'vitest';

type Handler = (context: unknown, next: () => Promise<Response>) => Promise<Response>;

async function run(pathname: string, response: Response) {
  const { onRequest } = (await import('../../src/middleware')) as unknown as { onRequest: Handler };
  return onRequest(
    {
      url: new URL(`https://movies.example${pathname}`),
      isPrerendered: false,
      request: new Request(`https://movies.example${pathname}`),
      clientAddress: '1.2.3.4'
    },
    async () => response
  );
}

describe('middleware', () => {
  it('adds security headers and no-cache to pages', async () => {
    const response = await run(
      '/',
      new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } })
    );
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('keeps the cache policy of API routes', async () => {
    const response = await run(
      '/api/discover.json',
      new Response('{}', {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
      })
    );
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('leaves redirects with immutable headers alone', async () => {
    const response = await run('/old', Response.redirect('https://movies.example/', 302));
    expect(response.status).toBe(302);
  });
});
