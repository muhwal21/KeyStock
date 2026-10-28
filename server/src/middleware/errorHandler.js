import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize';

export function notFound(req, res) {
  return res.status(404).json({ message: 'Endpoint tidak ditemukan.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof UniqueConstraintError) {
    const field = Object.keys(error.fields ?? {})[0] ?? '';
    const labels = { sku: 'SKU', username: 'Username', email: 'Email', name: 'Nama' };
    const label = Object.entries(labels).find(([key]) => field.includes(key))?.[1] ?? 'Data';
    return res.status(409).json({ message: `${label} sudah digunakan. Gunakan nilai lain.` });
  }
  if (error instanceof ForeignKeyConstraintError) {
    return res.status(409).json({ message: 'Data masih dipakai oleh catatan lain dan tidak dapat dihapus.' });
  }
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: 'Data tidak memenuhi validasi.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Ukuran file terlalu besar (maksimal 2 MB).' });
  }
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
}
