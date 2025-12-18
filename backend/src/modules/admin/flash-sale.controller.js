/**
 * Flash Sale Controller (Admin)
 * API endpoints for managing flash sale campaigns
 */

const flashSaleService = require('../product/services/flash-sale.service');
const { successResponse, errorResponse } = require('../../shared/utils/response.util');

// ============================================
// FLASH SALE CRUD
// ============================================

/**
 * Create flash sale
 * POST /api/admin/flash-sales
 */
async function createFlashSale(req, res, next) {
    try {
        const userId = req.user.userId;
        const flashSale = await flashSaleService.createFlashSale(req.body, userId);
        return successResponse(res, { flashSale }, 201);
    } catch (error) {
        next(error);
    }
}

/**
 * Update flash sale
 * PUT /api/admin/flash-sales/:id
 */
async function updateFlashSale(req, res, next) {
    try {
        const { id } = req.params;
        const flashSale = await flashSaleService.updateFlashSale(id, req.body);
        return successResponse(res, { flashSale });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete flash sale
 * DELETE /api/admin/flash-sales/:id
 */
async function deleteFlashSale(req, res, next) {
    try {
        const { id } = req.params;
        await flashSaleService.deleteFlashSale(id);
        return successResponse(res, { message: 'Flash sale deleted' });
    } catch (error) {
        next(error);
    }
}

/**
 * Get flash sale by ID
 * GET /api/admin/flash-sales/:id
 */
async function getFlashSale(req, res, next) {
    try {
        const { id } = req.params;
        const flashSale = await flashSaleService.getFlashSaleWithProducts(id);
        return successResponse(res, { flashSale });
    } catch (error) {
        next(error);
    }
}

/**
 * List flash sales
 * GET /api/admin/flash-sales
 */
async function listFlashSales(req, res, next) {
    try {
        const { status, isFeatured, page, limit } = req.query;
        const result = await flashSaleService.listFlashSales({
            status,
            isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

// ============================================
// FLASH SALE PRODUCTS
// ============================================

/**
 * Add product to flash sale
 * POST /api/admin/flash-sales/:id/products
 */
async function addProduct(req, res, next) {
    try {
        const { id } = req.params;
        const product = await flashSaleService.addProductToFlashSale(id, req.body);
        return successResponse(res, { product }, 201);
    } catch (error) {
        next(error);
    }
}

/**
 * Update flash sale product
 * PUT /api/admin/flash-sales/:id/products/:productId
 */
async function updateProduct(req, res, next) {
    try {
        const { productId } = req.params;
        const product = await flashSaleService.updateFlashSaleProduct(productId, req.body);
        return successResponse(res, { product });
    } catch (error) {
        next(error);
    }
}

/**
 * Remove product from flash sale
 * DELETE /api/admin/flash-sales/:id/products/:productId
 */
async function removeProduct(req, res, next) {
    try {
        const { productId } = req.params;
        await flashSaleService.removeProductFromFlashSale(productId);
        return successResponse(res, { message: 'Product removed from flash sale' });
    } catch (error) {
        next(error);
    }
}

/**
 * Get flash sale products
 * GET /api/admin/flash-sales/:id/products
 */
async function getProducts(req, res, next) {
    try {
        const { id } = req.params;
        const products = await flashSaleService.getFlashSaleProducts(id);
        return successResponse(res, { products });
    } catch (error) {
        next(error);
    }
}

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * Get active flash sales (public)
 * GET /api/flash-sales/active
 */
async function getActiveFlashSales(req, res, next) {
    try {
        const flashSales = await flashSaleService.getActiveFlashSales();
        return successResponse(res, { flashSales });
    } catch (error) {
        next(error);
    }
}

/**
 * Get flash sale products (public)
 * GET /api/flash-sales/:id/products
 */
async function getPublicFlashSaleProducts(req, res, next) {
    try {
        const { id } = req.params;
        const flashSale = await flashSaleService.getFlashSaleById(id);
        if (!flashSale || flashSale.status !== 'active') {
            return successResponse(res, { products: [] });
        }
        const products = await flashSaleService.getFlashSaleProducts(id);
        return successResponse(res, { flashSale, products });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    // Admin CRUD
    createFlashSale,
    updateFlashSale,
    deleteFlashSale,
    getFlashSale,
    listFlashSales,
    
    // Admin Products
    addProduct,
    updateProduct,
    removeProduct,
    getProducts,
    
    // Public
    getActiveFlashSales,
    getPublicFlashSaleProducts,
};
