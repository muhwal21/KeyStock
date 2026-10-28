import nodemailer from 'nodemailer';
import { config, isEmailConfigured } from '../config.js';

function transporter() {
  if (!isEmailConfigured) throw new Error('SMTP email belum dikonfigurasi.');
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

async function send({ to, subject, text }) {
  await transporter().sendMail({ from: config.smtp.from, to, subject, text });
}

export async function sendPasswordResetEmail(user, token) {
  const link = new URL('/', config.publicAppUrl);
  link.searchParams.set('resetToken', token);
  await send({
    to: user.email,
    subject: 'Atur ulang kata sandi KeyStock',
    text: `Halo ${user.name},\n\nGunakan tautan ini untuk mengatur ulang kata sandi KeyStock (berlaku 30 menit):\n${link}\n\nJika Anda tidak meminta ini, abaikan email ini.`,
  });
}

export async function sendRegistrationNotice(user) {
  if (!config.seedAdminEmail) return false;
  await send({
    to: config.seedAdminEmail,
    subject: 'Pendaftaran akun KeyStock menunggu review',
    text: `Ada pendaftaran akun baru yang menunggu persetujuan admin.\nNama: ${user.name}\nUsername: ${user.username}\nEmail: ${user.email}\nTinjau melalui halaman Pengguna di ${config.publicAppUrl}.`,
  });
  return true;
}

export async function sendReviewResult(user, approved) {
  await send({
    to: user.email,
    subject: approved ? 'Akun KeyStock disetujui' : 'Status pendaftaran KeyStock',
    text: approved
      ? `Halo ${user.name},\n\nAkun KeyStock Anda telah disetujui. Silakan masuk di ${config.publicAppUrl}.`
      : `Halo ${user.name},\n\nPendaftaran akun KeyStock Anda belum disetujui. Hubungi admin jika Anda memerlukan informasi lebih lanjut.`,
  });
}
