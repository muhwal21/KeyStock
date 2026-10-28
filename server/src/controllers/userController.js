import { col, fn } from 'sequelize';
import { StockMovement, User } from '../models/index.js';

// Admin-only user management. Self-registration creates staff accounts; an admin can
// promote, demote, or deactivate them here.
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

    const removesAdmin = user.role === 'admin' && user.is_active && (req.body.role !== 'admin' || !req.body.is_active);
    if (removesAdmin) {
      const activeAdmins = await User.count({ where: { role: 'admin', is_active: true } });
      if (activeAdmins <= 1) {
        return res.status(400).json({ message: 'Minimal harus ada satu admin aktif.' });
      }
    }

    await user.update({ role: req.body.role, is_active: req.body.is_active });
    return res.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, is_active: user.is_active } });
  } catch (error) {
    return next(error);
  }
}
