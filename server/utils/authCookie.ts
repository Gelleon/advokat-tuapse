import type { CookieOptions } from 'express';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getAuthCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    // lax: работает для same-origin (/api на том же домене)
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_WEEK_MS
  };
}
