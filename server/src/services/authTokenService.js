import { SignJWT, jwtVerify } from 'jose';
import { config, isProduction } from '../config.js';

const signingKey = new TextEncoder().encode(config.jwtSecret);
const rememberedSessionSeconds = 30 * 24 * 60 * 60;
const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/api',
};

export async function createAccessToken(user, { rememberMe = false } = {}) {
  const expiresIn = rememberMe ? rememberedSessionSeconds : config.jwtExpiresSeconds;
  return new SignJWT({ role: user.role, ver: user.token_version ?? 0 })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(user.id))
    .setIssuer('keystock')
    .setAudience('keystock-web')
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
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

export function issueAccessCookie(res, token, { rememberMe = false } = {}) {
  const maxAge = (rememberMe ? rememberedSessionSeconds : config.jwtExpiresSeconds) * 1000;
  res.cookie(config.accessCookieName, token, { ...accessCookieOptions, maxAge });
}

export function clearAccessCookie(res) {
  const { maxAge, ...clearOptions } = accessCookieOptions;
  res.clearCookie(config.accessCookieName, clearOptions);
}
