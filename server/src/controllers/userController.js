import { col, fn, Op } from 'sequelize';
import { isEmailConfigured } from '../config.js';
import { ADMIN_ROLES, hasAdminAccess } from '../constants.js';
import { StockMovement, User } from '../models/index.js';
import { sendReviewResult } from '../services/emailService.js';

// Admin and Dosen manage accounts. Self-registration creates Staff accounts.
export async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: {
        // Equivalent of Eloquent's withCount('movements'): a LEFT JOIN + COUNT per user.
        include: [[fn('COUNT', col('movements.id')), 'movement_count']],
      },
      include: [{ model: StockMovement, as: 'movements', attributes: [] }],
      group: ['User.id'],
      order: [['is_active', 'DESC'], ['role', 'ASC'], ['name', 'ASC']],
    });
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Anda tidak dapat mengubah peran atau menonaktifkan akun sendiri.' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    if (req.body.is_active && user.approval_status !== 'approved') {
      return res.status(400).json({ message: 'Pendaftaran harus disetujui admin sebelum akun dapat diaktifkan.' });
    }

    const removesAdmin = hasAdminAccess(user.role) && user.is_active
      && (!hasAdminAccess(req.body.role) || !req.body.is_active);
    if (removesAdmin) {
      const activeAdmins = await User.count({ where: { role: { [Op.in]: ADMIN_ROLES }, is_active: true } });
      if (activeAdmins <= 1) {
        return res.status(400).json({ message: 'Minimal harus ada satu akun Admin atau Dosen aktif.' });
      }
    }

    const accessChanged = user.role !== req.body.role || user.is_active !== req.body.is_active;
    await user.update({ role: req.body.role, is_active: req.body.is_active, token_version: user.token_version + (accessChanged ? 1 : 0) });
    return res.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, is_active: user.is_active } });
  } catch (error) {
    return next(error);
  }
}

export async function reviewUser(req, res, next) {
  try {
    const user = await User.findByPk(Number(req.params.id));
    if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    if (user.approval_status !== 'pending') return res.status(409).json({ message: 'Pendaftaran ini sudah ditinjau.' });

    const approved = req.body.action === 'approve';
    await user.update({
      approval_status: approved ? 'approved' : 'rejected',
      is_active: approved,
      token_version: user.token_version + 1,
    });
    let emailSent = false;
    if (isEmailConfigured) {
      try { await sendReviewResult(user, approved); emailSent = true; }
      catch (error) { console.error('Account review email failed:', error.message); }
    }
    return res.json({
      user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, is_active: user.is_active, approval_status: user.approval_status },
      emailSent,
      emailConfigured: isEmailConfigured,
    });
  } catch (error) {
    return next(error);
  }
}
