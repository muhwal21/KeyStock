import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, getCsrfToken, getCurrentUser, logout, register } from '../controllers/authController.js';
import { getDashboard } from '../controllers/dashboardController.js';
import { createProduct, deleteProduct, getProduct, listCategories, listProducts, updateProduct } from '../controllers/productController.js';
import { deleteImage, listImages, reorderImages, sendImageFile, uploadImage } from '../controllers/productImageController.js';
import { archiveSupplier, createSupplier, listSuppliers, updateSupplier } from '../controllers/supplierController.js';
import { createMovement, listMovements } from '../controllers/stockMovementController.js';
import { listUsers, updateUser } from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  imageOrderSchema, loginSchema, movementSchema, productSchema, registerSchema, supplierSchema, userUpdateSchema,
} from '../middleware/validators.js';

const router = Router();
// Photo uploads are sent as the raw file body (Content-Type image/jpeg|png|webp), max 2 MB.
const imageBody = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Terlalu banyak pendaftaran dari jaringan ini. Coba lagi nanti.' },
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.get('/auth/csrf', getCsrfToken);
router.get('/auth/me', getCurrentUser);
router.post('/auth/register', registerLimiter, validateBody(registerSchema), register);
router.post('/auth/login', loginLimiter, validateBody(loginSchema), login);
router.post('/auth/logout', logout);

router.use(requireAuth);
router.get('/dashboard', getDashboard);
router.get('/categories', listCategories);
router.get('/suppliers', listSuppliers);
router.post('/suppliers', requireRole('admin'), validateBody(supplierSchema), createSupplier);
router.put('/suppliers/:id', requireRole('admin'), validateBody(supplierSchema), updateSupplier);
router.delete('/suppliers/:id', requireRole('admin'), archiveSupplier);
router.get('/products', listProducts);
router.post('/products', requireRole('admin'), validateBody(productSchema), createProduct);
router.put('/products/:id', requireRole('admin'), validateBody(productSchema), updateProduct);
router.delete('/products/:id', requireRole('admin'), deleteProduct);
router.get('/products/:id', getProduct);
router.get('/products/:id/images', listImages);
router.get('/products/:id/images/:imageId/file', sendImageFile);
router.post('/products/:id/images', requireRole('admin'), imageBody, uploadImage);
router.put('/products/:id/images/order', requireRole('admin'), validateBody(imageOrderSchema), reorderImages);
router.delete('/products/:id/images/:imageId', requireRole('admin'), deleteImage);
router.get('/stock-movements', listMovements);
router.post('/stock-movements', validateBody(movementSchema), createMovement);
router.get('/users', requireRole('admin'), listUsers);
router.patch('/users/:id', requireRole('admin'), validateBody(userUpdateSchema), updateUser);

export default router;
