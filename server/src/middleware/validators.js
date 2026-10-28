import { z } from 'zod';
import { ALL_REASONS, MOVEMENT_REASONS } from '../constants.js';

// Defense in depth against XSS: Vue already escapes text on render, but the API also
// refuses to store HTML markup. Tags are removed and stray angle brackets dropped.
export function stripTags(value) {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
}

function plainText({ min = 0, max, label = 'Kolom ini' }) {
  return z.string()
    .transform(stripTags)
    .pipe(z.string()
      .min(min, min > 1 ? `${label} minimal ${min} karakter.` : `${label} wajib diisi.`)
      .max(max, `${label} maksimal ${max} karakter.`));
}

function optionalText({ max, label }) {
  return plainText({ max, label }).optional().transform((value) => value || null);
}

// Only http(s) links are accepted, so values such as "javascript:alert(1)" can never be
// stored and later rendered inside an <a href>.
const webUrl = z.url({ protocol: /^https?$/, message: 'Gunakan URL yang diawali http:// atau https://.' }).max(1000);
const optionalUrl = z.union([webUrl, z.literal('')]).optional().transform((value) => value || null);
const optionalPrice = z.preprocess(
  (value) => value === '' ? null : value,
  z.union([z.null(), z.coerce.number().nonnegative('Harga tidak boleh negatif.')]).default(null),
);

const optionalSupplierId = z.preprocess(
  (value) => value === '' ? null : value,
  z.union([z.null(), z.coerce.number().int().positive()]).default(null),
);

const email = z.string().trim().toLowerCase().pipe(z.email('Format email tidak valid.').max(190));

export const username = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, 'Username 3–30 karakter: huruf kecil, angka, titik, atau garis bawah.');

// Login accepts either the username or the email address in one field.
export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, 'Username atau email wajib diisi.').max(190),
  password: z.string().min(1, 'Kata sandi wajib diisi.').max(128),
});

const strongPassword = z.string()
  .min(10, 'Kata sandi minimal 10 karakter.')
  .max(64, 'Kata sandi maksimal 64 karakter.')
  .regex(/[A-Z]/, 'Tambahkan minimal satu huruf besar.')
  .regex(/[a-z]/, 'Tambahkan minimal satu huruf kecil.')
  .regex(/[0-9]/, 'Tambahkan minimal satu angka.')
  .regex(/[^A-Za-z0-9\s]/, 'Tambahkan minimal satu simbol.')
  .regex(/^\S+$/, 'Kata sandi tidak boleh mengandung spasi.');

export const registerSchema = z.object({
  name: plainText({ min: 2, max: 120, label: 'Nama' }),
  username,
  email,
  password: strongPassword,
  password_confirmation: z.string().max(64),
}).refine((data) => data.password === data.password_confirmation, {
  path: ['password_confirmation'], message: 'Konfirmasi kata sandi tidak sama.',
});

export const emailSchema = z.object({ email });
export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(200),
  password: strongPassword,
  password_confirmation: z.string().max(64),
}).refine((data) => data.password === data.password_confirmation, {
  path: ['password_confirmation'], message: 'Konfirmasi kata sandi tidak sama.',
});

export const userUpdateSchema = z.object({
  role: z.enum(['admin', 'staff', 'lecturer']),
  is_active: z.boolean(),
});
export const reviewUserSchema = z.object({ action: z.enum(['approve', 'reject']) });

export const productSchema = z.object({
  sku: z.string().trim().min(2, 'SKU minimal 2 karakter.').max(100).regex(/^[A-Za-z0-9._-]+$/, 'SKU hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.'),
  name: plainText({ min: 2, max: 190, label: 'Nama produk' }),
  brand: plainText({ min: 1, max: 120, label: 'Brand' }),
  category_id: z.coerce.number().int().positive('Pilih kategori.'),
  supplier_id: optionalSupplierId,
  description: plainText({ max: 5000, label: 'Deskripsi' }).optional().default(''),
  price_min: optionalPrice,
  price_max: optionalPrice,
  purchase_price: optionalPrice,
  selling_price: optionalPrice,
  currency: z.enum(['IDR', 'USD']).default('IDR'),
  listing_status: plainText({ min: 1, max: 120, label: 'Status listing' }).default('Ready'),
  reorder_point: z.coerce.number().int().nonnegative('Batas minimum tidak boleh negatif.').max(1000000),
  // Rack location RAK-TINGKAT-SLOT, e.g. A-1-05 (rack letter, shelf level, slot number).
  storage_location: z.string().trim().toUpperCase()
    .regex(/^([A-Z]-[1-9]-\d{2})?$/, 'Format lokasi RAK-TINGKAT-SLOT, contoh A-1-05.')
    .optional().default(''),
  source_url: optionalUrl,
  specifications: z.record(z.string(), z.unknown()).optional().default({}),
  variants: z.array(plainText({ max: 190, label: 'Varian' })).optional().default([]),
  is_active: z.boolean().optional().default(true),
}).refine((data) => data.price_min == null || data.price_max == null || data.price_min <= data.price_max, {
  path: ['price_max'], message: 'Harga maksimum harus sama dengan atau lebih besar dari harga minimum.',
}).refine((data) => data.purchase_price == null || data.selling_price == null || data.purchase_price <= data.selling_price, {
  path: ['selling_price'], message: 'Harga jual harus sama dengan atau lebih besar dari harga beli.',
});

export const supplierSchema = z.object({
  name: plainText({ min: 2, max: 150, label: 'Nama supplier' }),
  contact_person: optionalText({ max: 120, label: 'Nama kontak' }),
  phone: z.string().trim().max(40).regex(/^[0-9+()\-\s]*$/, 'Nomor telepon hanya boleh berisi angka, spasi, +, -, atau tanda kurung.').optional().transform((value) => value || null),
  email: z.union([email, z.literal('')]).optional().transform((value) => value || null),
  city: optionalText({ max: 100, label: 'Kota' }),
  website: optionalUrl,
  notes: optionalText({ max: 500, label: 'Catatan' }),
  is_active: z.boolean().optional().default(true),
});

export const imageOrderSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(20),
});

export const movementSchema = z.object({
  product_id: z.coerce.number().int().positive('Pilih produk.'),
  movement_type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().int('Jumlah harus bilangan bulat.').nonnegative('Jumlah tidak boleh negatif.').max(1000000),
  reason: z.enum(ALL_REASONS).optional(),
  note: plainText({ max: 500, label: 'Catatan' }).optional().default(''),
}).refine((data) => data.movement_type === 'ADJUSTMENT' || data.quantity > 0, {
  path: ['quantity'], message: 'Jumlah harus lebih dari nol.',
}).refine((data) => !data.reason || MOVEMENT_REASONS[data.movement_type].includes(data.reason), {
  path: ['reason'], message: 'Alasan tidak sesuai dengan jenis pergerakan.',
}).transform((data) => ({ ...data, reason: data.reason ?? MOVEMENT_REASONS[data.movement_type][0] }));
