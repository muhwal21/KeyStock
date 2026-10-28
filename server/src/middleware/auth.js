import { User } from '../models/index.js';

export async function requireAuth(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Silakan login terlebih dahulu.' });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user || !user.is_active) {
      req.session.destroy(() => {});
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
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses tidak diizinkan untuk peran ini.' });
    }
    return next();
  };
}
