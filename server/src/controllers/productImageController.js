import { Product, ProductImage, sequelize } from '../models/index.js';

const MAX_IMAGES = 8;
const MAX_BYTES = 2 * 1024 * 1024;

// The file signature ("magic bytes") is checked instead of trusting the Content-Type header,
// so a renamed HTML or script file cannot be stored as an image.
function detectImageType(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export function imageUrl(image) {
  return image.url ?? `/api/products/${image.product_id}/images/${image.id}/file`;
}

export function serializeImage(image) {
  return { id: image.id, url: imageUrl(image), sort_order: image.sort_order, byte_size: image.byte_size, uploaded: !image.url };
}

// products.image_url always points at the first gallery photo (used for table thumbnails).
async function syncPrimaryImage(productId, transaction) {
  const first = await ProductImage.findOne({ where: { product_id: productId }, order: [['sort_order', 'ASC'], ['id', 'ASC']], transaction });
  await Product.update({ image_url: first ? imageUrl(first) : null }, { where: { id: productId }, transaction });
}

async function activeProduct(req, res) {
  const product = await Product.findByPk(Number(req.params.id));
  if (!product || !product.is_active) {
    res.status(404).json({ message: 'Produk tidak ditemukan.' });
    return null;
  }
  return product;
}

export async function listImages(req, res, next) {
  try {
    const product = await activeProduct(req, res);
    if (!product) return undefined;
    const images = await ProductImage.findAll({ where: { product_id: product.id }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    return res.json({ images: images.map(serializeImage) });
  } catch (error) {
    return next(error);
  }
}

export async function sendImageFile(req, res, next) {
  try {
    const image = await ProductImage.unscoped().findOne({ where: { id: Number(req.params.imageId), product_id: Number(req.params.id) } });
    if (!image || !image.data) return res.status(404).json({ message: 'Foto tidak ditemukan.' });
    res.set({
      'Content-Type': image.mime_type,
      'Content-Length': image.byte_size,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(image.data);
  } catch (error) {
    return next(error);
  }
}

export async function uploadImage(req, res, next) {
  try {
    const product = await activeProduct(req, res);
    if (!product) return undefined;
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ message: 'Pilih file foto JPG, PNG, atau WebP.' });
    }
    if (buffer.length > MAX_BYTES) return res.status(413).json({ message: 'Ukuran foto maksimal 2 MB.' });
    const mimeType = detectImageType(buffer);
    if (!mimeType) return res.status(415).json({ message: 'File bukan foto JPG, PNG, atau WebP yang valid.' });

    const image = await sequelize.transaction(async (transaction) => {
      const count = await ProductImage.count({ where: { product_id: product.id }, transaction });
      if (count >= MAX_IMAGES) return null;
      const lastOrder = (await ProductImage.max('sort_order', { where: { product_id: product.id }, transaction })) ?? -1;
      const created = await ProductImage.create({
        product_id: product.id, data: buffer, mime_type: mimeType, byte_size: buffer.length, sort_order: lastOrder + 1,
      }, { transaction });
      await syncPrimaryImage(product.id, transaction);
      return created;
    });
    if (!image) return res.status(400).json({ message: `Maksimal ${MAX_IMAGES} foto per produk.` });
    return res.status(201).json({ image: serializeImage(image) });
  } catch (error) {
    return next(error);
  }
}

export async function reorderImages(req, res, next) {
  try {
    const product = await activeProduct(req, res);
    if (!product) return undefined;
    const images = await ProductImage.findAll({ where: { product_id: product.id } });
    const current = new Set(images.map((image) => image.id));
    const { ids } = req.body;
    if (ids.length !== current.size || new Set(ids).size !== ids.length || ids.some((id) => !current.has(id))) {
      return res.status(400).json({ message: 'Urutan foto tidak sesuai dengan foto produk.' });
    }
    await sequelize.transaction(async (transaction) => {
      for (const [index, id] of ids.entries()) {
        await ProductImage.update({ sort_order: index }, { where: { id, product_id: product.id }, transaction });
      }
      await syncPrimaryImage(product.id, transaction);
    });
    const ordered = await ProductImage.findAll({ where: { product_id: product.id }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    return res.json({ images: ordered.map(serializeImage) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteImage(req, res, next) {
  try {
    const product = await activeProduct(req, res);
    if (!product) return undefined;
    const removed = await sequelize.transaction(async (transaction) => {
      const count = await ProductImage.destroy({ where: { id: Number(req.params.imageId), product_id: product.id }, transaction });
      if (count) await syncPrimaryImage(product.id, transaction);
      return count;
    });
    if (!removed) return res.status(404).json({ message: 'Foto tidak ditemukan.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}
