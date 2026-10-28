// Stand-in for Astro's virtual `astro:middleware` module in unit tests.
export const defineMiddleware = <T>(handler: T): T => handler;
