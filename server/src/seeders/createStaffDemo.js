import bcrypt from 'bcryptjs';
import { sequelize, User } from '../models/index.js';

const email = process.env.SEED_STAFF_EMAIL?.trim().toLowerCase();
const username = (process.env.SEED_STAFF_USERNAME?.trim() || 'staff').toLowerCase();
const name = process.env.SEED_STAFF_NAME?.trim() || 'Staff Demo UAS';
const password = process.env.SEED_STAFF_PASSWORD ?? '';

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Set SEED_STAFF_EMAIL ke alamat email yang valid.');
}
if (!/^[a-z0-9._]{3,30}$/.test(username)) {
  throw new Error('SEED_STAFF_USERNAME harus 3–30 karakter: huruf kecil, angka, titik, atau garis bawah.');
}
if (password.length < 12 || password.length > 128 || /replace-with|change-me/i.test(password)) {
  throw new Error('Set SEED_STAFF_PASSWORD dengan 12–128 karakter dan bukan nilai contoh.');
}

try {
  await sequelize.authenticate();
  const user = await User.unscoped().findOne({ where: { email } });
  const usernameOwner = await User.unscoped().findOne({ where: { username } });
  if (usernameOwner && (!user || usernameOwner.id !== user.id)) {
    throw new Error(`Username "${username}" sudah digunakan akun lain.`);
  }
  if (user && user.role !== 'staff') {
    throw new Error('Email tersebut sudah terhubung ke akun non-staff; akun tidak diubah.');
  }

  if (!user) {
    await User.unscoped().create({
      name,
      username,
      email,
      password_hash: await bcrypt.hash(password, 12),
      role: 'staff',
      is_active: true,
      approval_status: 'approved',
    });
    console.log(`Akun staff demo dibuat dan aktif: ${username} (${email}).`);
  } else {
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    const accessChanged = !user.is_active || user.approval_status !== 'approved' || !passwordMatches;
    await user.update({
      name,
      username,
      is_active: true,
      approval_status: 'approved',
      ...(passwordMatches ? {} : { password_hash: await bcrypt.hash(password, 12) }),
      ...(accessChanged ? { token_version: user.token_version + 1 } : {}),
    });
    console.log(`Akun staff demo disinkronkan dan aktif: ${username} (${email}).`);
  }
} catch (error) {
  console.error('Pembuatan akun staff demo gagal:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
