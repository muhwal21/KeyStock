import { randomBytes, timingSafeEqual } from 'node:crypto';
import { config, isProduction } from '../config.js';

const csrfCookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'lax',
  path: '/api',
  maxAge: 8 * 60 * 60 * 1000,
};

export function createCsrfToken() {
  return randomBytes(32).toString('hex');
}

export function issueCsrfToken(res, token = createCsrfToken()) {
  res.cookie(config.csrfCookieName, token, csrfCookieOptions);
  return token;
}

export function getCsrfToken(req, res) {
  const token = req.cookies?.[config.csrfCookieName] || createCsrfToken();
  issueCsrfToken(res, token);
  return token;
}

export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const expected = req.cookies?.[config.csrfCookieName];
  const received = req.get('x-csrf-token');
  if (!expected || !received) {
    return res.status(403).json({ message: 'Token keamanan tidak ditemukan. Muat ulang halaman.' });
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return res.status(403).json({ message: 'Token keamanan tidak valid. Muat ulang halaman.' });
  }

  return next();
}
