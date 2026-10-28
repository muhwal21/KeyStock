import { SignJWT, jwtVerify } from 'jose';
import { config, isProduction } from '../config.js';

const signingKey = new TextEncoder().encode(config.jwtSecret);
const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/api',
  maxAge: config.jwtExpiresSeconds * 1000,
};

export async function createAccessToken(user) {
  return new SignJWT({ role: user.role, ver: user.token_version ?? 0 })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(user.id))
    .setIssuer('keystock')
    .setAudience('keystock-web')
    .setIssuedAt()
    .setExpirationTime(`${config.jwtExpiresSeconds}s`)
    .sign(signingKey);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, signingKey, {
    algorithms: ['HS256'],
    issuer: 'keystock',
    audience: 'keystock-web',
  });
  return payload;
}

export function issueAccessCookie(res, token) {
  res.cookie(config.accessCookieName, token, accessCookieOptions);
}

export function clearAccessCookie(res) {
  const { maxAge, ...clearOptions } = accessCookieOptions;
  res.clearCookie(config.accessCookieName, clearOptions);
}
