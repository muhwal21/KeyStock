import { Supplier } from '../models/index.js';

export async function listSuppliers(req, res, next) {
  try {
    const where = req.user.role === 'admin' && req.query.includeArchived === 'true' ? {} : { is_active: true };
    const suppliers = await Supplier.findAll({ order: [['is_active', 'DESC'], ['name', 'ASC']], where });
    return res.json({ suppliers });
  } catch (error) {
    return next(error);
  }
}

export async function createSupplier(req, res, next) {
  try {
    const supplier = await Supplier.create(req.body);
    return res.status(201).json({ supplier });
  } catch (error) {
    return next(error);
  }
}

export async function updateSupplier(req, res, next) {
  try {
    const supplier = await Supplier.findByPk(Number(req.params.id));
    if (!supplier || !supplier.is_active) return res.status(404).json({ message: 'Supplier tidak ditemukan.' });
    await supplier.update(req.body);
    return res.json({ supplier });
  } catch (error) {
    return next(error);
  }
}

export async function archiveSupplier(req, res, next) {
  try {
    const supplier = await Supplier.findByPk(Number(req.params.id));
    if (!supplier || !supplier.is_active) return res.status(404).json({ message: 'Supplier tidak ditemukan.' });
    await supplier.update({ is_active: false });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}
