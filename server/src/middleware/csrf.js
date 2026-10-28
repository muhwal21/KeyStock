import { randomBytes, timingSafeEqual } from 'node:crypto';

export function createCsrfToken() {
  return randomBytes(32).toString('hex');
}

export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const expected = req.session?.csrfToken;
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
