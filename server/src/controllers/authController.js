import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import { isEmailConfigured } from '../config.js';
import { PasswordReset, sequelize, User } from '../models/index.js';
import { getCsrfToken as obtainCsrfToken, issueCsrfToken } from '../middleware/csrf.js';
import { resolveAuthenticatedUser } from '../middleware/auth.js';
import { clearAccessCookie, createAccessToken, issueAccessCookie } from '../services/authTokenService.js';
import { sendPasswordResetEmail, sendRegistrationNotice } from '../services/emailService.js';

function publicUser(user) {
  return { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role };
}

export function getCsrfToken(req, res) {
  return res.json({ csrfToken: obtainCsrfToken(req, res) });
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user) clearAccessCookie(res);
    return res.json({ user: user ? publicUser(user) : null });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    // One field for both: an "@" means email, otherwise it is a username.
    const { identifier } = req.body;
    const where = identifier.includes('@') ? { email: identifier } : { username: identifier };
    const user = await User.unscoped().findOne({ where });
    const validPassword = user && await bcrypt.compare(req.body.password, user.password_hash);
    if (!user || !validPassword) {
      return res.status(401).json({ message: 'Username/email atau kata sandi tidak sesuai.' });
    }
    if (user?.approval_status === 'pending') return res.status(403).json({ message: 'Akun sedang menunggu persetujuan admin. Hasil review akan dikirim melalui email.' });
    if (user?.approval_status === 'rejected') return res.status(403).json({ message: 'Pendaftaran akun belum disetujui. Silakan hubungi admin.' });
    if (!user.is_active) {
      return res.status(401).json({ message: 'Username/email atau kata sandi tidak sesuai.' });
    }

    const token = await createAccessToken(user);
    issueAccessCookie(res, token);
    const csrfToken = issueCsrfToken(res);
    return res.json({ user: publicUser(user), csrfToken });
  } catch (error) {
    return next(error);
  }
}

// Public registration creates a pending staff account; admin approval is required before login.
export async function register(req, res, next) {
  try {
    const [emailTaken, usernameTaken] = await Promise.all([
      User.unscoped().findOne({ where: { email: req.body.email } }),
      User.unscoped().findOne({ where: { username: req.body.username } }),
    ]);
    if (emailTaken || usernameTaken) {
      const errors = [];
      if (usernameTaken) errors.push({ field: 'username', message: 'Username sudah dipakai.' });
      if (emailTaken) errors.push({ field: 'email', message: 'Email sudah terdaftar.' });
      return res.status(409).json({ message: 'Akun dengan data ini sudah ada.', errors });
    }

    const user = await User.create({
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      password_hash: await bcrypt.hash(req.body.password, 12),
      role: 'staff',
      is_active: false,
      approval_status: 'pending',
    });
    let emailNotificationSent = false;
    if (isEmailConfigured) {
      try { emailNotificationSent = await sendRegistrationNotice(user); }
      catch (emailError) { console.error('Registration notification failed:', emailError.message); }
    }
    return res.status(202).json({
      pending: true,
      emailNotificationSent,
      emailConfigured: isEmailConfigured,
      message: 'Pendaftaran tersimpan dan sedang menunggu review admin.',
    });
  } catch (error) {
    return next(error);
  }
}

const tokenDigest = (token) => createHash('sha256').update(token).digest('hex');

export async function requestPasswordReset(req, res, next) {
  if (!isEmailConfigured) {
    return res.status(503).json({ message: 'Pemulihan kata sandi belum aktif karena email server belum dikonfigurasi.' });
  }
  try {
    const user = await User.findOne({ where: { email: req.body.email.toLowerCase(), is_active: true, approval_status: 'approved' } });
    if (user) {
      await PasswordReset.destroy({ where: { user_id: user.id } });
      const token = randomBytes(32).toString('base64url');
      const reset = await PasswordReset.create({ user_id: user.id, token_hash: tokenDigest(token), expires_at: new Date(Date.now() + 30 * 60 * 1000) });
      try { await sendPasswordResetEmail(user, token); }
      catch (error) { await reset.destroy(); throw error; }
    }
    return res.json({ message: 'Jika email terdaftar, tautan pemulihan akan dikirim.' });
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const reset = await PasswordReset.findOne({ where: { token_hash: tokenDigest(req.body.token), used_at: null }, transaction });
    if (!reset || reset.expires_at <= new Date()) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tautan pemulihan tidak berlaku atau sudah kedaluwarsa.' });
    }
    const user = await User.findByPk(reset.user_id, { transaction });
    if (!user || !user.is_active || user.approval_status !== 'approved') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Akun tidak dapat dipulihkan.' });
    }
    await user.update({ password_hash: await bcrypt.hash(req.body.password, 12), token_version: user.token_version + 1 }, { transaction });
    await reset.update({ used_at: new Date() }, { transaction });
    await PasswordReset.destroy({ where: { user_id: user.id, id: { [Op.ne]: reset.id } }, transaction });
    await transaction.commit();
    clearAccessCookie(res);
    return res.json({ message: 'Kata sandi berhasil diperbarui. Silakan masuk kembali.' });
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
}

export function logout(req, res) {
  clearAccessCookie(res);
  return res.status(204).end();
}
