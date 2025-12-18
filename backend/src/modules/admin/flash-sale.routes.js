/**
 * Flash Sale Routes
 * API routes for flash sale management
 */

const express = require('express');
const router = express.Router();
const flashSaleController = require('./flash-sale.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

// ============================================
// ADMIN ROUTES - /api/admin/flash-sales
// ============================================

const adminRouter = express.Router();

// CRUD
adminRouter.get('/', authenticate, authorize('admin'), flashSaleController.listFlashSales);
adminRouter.post('/', authenticate, authorize('admin'), flashSaleController.createFlashSale);
adminRouter.get('/:id', authenticate, authorize('admin'), flashSaleController.getFlashSale);
adminRouter.put('/:id', authenticate, authorize('admin'), flashSaleController.updateFlashSale);
adminRouter.delete('/:id', authenticate, authorize('admin'), flashSaleController.deleteFlashSale);

// Products
adminRouter.get('/:id/products', authenticate, authorize('admin'), flashSaleController.getProducts);
adminRouter.post('/:id/products', authenticate, authorize('admin'), flashSaleController.addProduct);
adminRouter.put('/:id/products/:productId', authenticate, authorize('admin'), flashSaleController.updateProduct);
adminRouter.delete('/:id/products/:productId', authenticate, authorize('admin'), flashSaleController.removeProduct);

// ============================================
// PUBLIC ROUTES - /api/flash-sales
// ============================================

const publicRouter = express.Router();

publicRouter.get('/active', flashSaleController.getActiveFlashSales);
publicRouter.get('/:id/products', flashSaleController.getPublicFlashSaleProducts);

module.exports = {
    adminRouter,
    publicRouter,
};
