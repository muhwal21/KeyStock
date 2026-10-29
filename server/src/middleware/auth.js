import { User } from '../models/index.js';
import { config } from '../config.js';
import { ADMIN_ROLES } from '../constants.js';
import { clearAccessCookie, verifyAccessToken } from '../services/authTokenService.js';

export async function resolveAuthenticatedUser(req) {
  const token = req.cookies?.[config.accessCookieName];
  if (!token) return null;

  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    return null;
  }

  const userId = Number(payload.sub);
  if (!Number.isSafeInteger(userId) || userId < 1) return null;

  const user = await User.findByPk(userId);
  return user?.is_active && user.approval_status === 'approved' && (payload.ver ?? 0) === (user.token_version ?? 0) ? user : null;
}

export async function requireAuth(req, res, next) {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user) {
      clearAccessCookie(res);
      return res.status(401).json({ message: 'Sesi tidak berlaku. Silakan login kembali.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const allowedRoles = roles.includes('admin') ? [...new Set([...roles, ...ADMIN_ROLES])] : roles;
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses tidak diizinkan untuk peran ini.' });
    }
    return next();
  };
}
