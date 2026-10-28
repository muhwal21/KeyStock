import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(projectRoot, 'server/src/seeders/catalog.json');
const imageDirectory = path.join(projectRoot, 'client/public/images');
const allowedHosts = new Set(['cdn.shopify.com', 'framerusercontent.com']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));

await mkdir(imageDirectory, { recursive: true });

const imageBySource = new Map();
let downloaded = 0;

for (const product of catalog.produk) {
  const source = product.gambar?.[0];
  if (!source) continue;

  const url = new URL(source);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) {
    throw new Error(`Image source host is not approved for download: ${url.hostname}`);
  }

  const extension = path.extname(url.pathname).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error(`Unsupported image extension for ${product.id}: ${extension || '(none)'}`);
  }

  const filePath = path.join(imageDirectory, `${product.id}${extension}`);
  if (imageBySource.has(source)) {
    await copyFile(imageBySource.get(source), filePath);
    continue;
  }

  try {
    const existing = await stat(filePath);
    if (existing.size > 0) {
      imageBySource.set(source, filePath);
      continue;
    }
  } catch {
    // Download when the local file is missing.
  }

  const result = spawnSync('curl', [
    '--fail', '--location', '--silent', '--show-error',
    '--max-time', '45', '--max-filesize', '15000000',
    '--user-agent', 'KeyStockInventoryDemo/1.0',
    '--output', filePath, source,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    await rm(filePath, { force: true });
    throw new Error(`Could not download ${product.id}: ${result.stderr.trim() || result.error?.message}`);
  }

  const file = await stat(filePath);
  if (file.size === 0) {
    await rm(filePath, { force: true });
    throw new Error(`Downloaded image for ${product.id} is empty.`);
  }

  imageBySource.set(source, filePath);
  downloaded += 1;
}

console.log(`Downloaded ${downloaded} unique product images to client/public/images.`);
