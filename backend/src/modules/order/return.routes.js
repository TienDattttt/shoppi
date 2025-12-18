/**
 * Return Request Routes
 * API routes for return/refund management
 */

const express = require('express');
const multer = require('multer');
const returnController = require('./return.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { attachShop } = require('../shop/shop.middleware');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
        files: 5, // Max 5 files
    },
    fileFilter: (req, file, cb) => {
        // Accept images and videos
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed'), false);
        }
    },
});

// ============================================
// CUSTOMER ROUTES - /api/returns
// ============================================

const customerRouter = express.Router();

// Get return reasons (public)
customerRouter.get('/reasons', returnController.getReturnReasons);

// Upload evidence images
customerRouter.post('/upload', authenticate, authorize('customer'), upload.array('files', 5), returnController.uploadEvidence);

// Customer routes (authenticated)
customerRouter.get('/', authenticate, authorize('customer'), returnController.getMyReturnRequests);
customerRouter.post('/', authenticate, authorize('customer'), returnController.createReturnRequest);
customerRouter.get('/:id', authenticate, returnController.getReturnRequest);
customerRouter.post('/:id/cancel', authenticate, authorize('customer'), returnController.cancelReturnRequest);
customerRouter.post('/:id/ship', authenticate, authorize('customer'), returnController.shipReturn);
customerRouter.post('/:id/escalate', authenticate, authorize('customer'), returnController.escalateReturnRequest);

// ============================================
// PARTNER ROUTES - /api/partner/returns
// ============================================

const partnerRouter = express.Router();

partnerRouter.get('/', authenticate, authorize('partner'), attachShop, returnController.getShopReturnRequests);
partnerRouter.get('/:id', authenticate, authorize('partner'), attachShop, returnController.getReturnRequest);
partnerRouter.post('/:id/approve', authenticate, authorize('partner'), attachShop, returnController.approveReturnRequest);
partnerRouter.post('/:id/reject', authenticate, authorize('partner'), attachShop, returnController.rejectReturnRequest);
partnerRouter.post('/:id/receive', authenticate, authorize('partner'), attachShop, returnController.confirmReceived);
partnerRouter.post('/:id/refund', authenticate, authorize('partner'), attachShop, returnController.processRefund);

// ============================================
// ADMIN ROUTES - /api/admin/returns
// ============================================

const adminRouter = express.Router();

adminRouter.get('/', authenticate, authorize('admin'), returnController.getEscalatedReturns);
adminRouter.get('/:id', authenticate, authorize('admin'), returnController.getReturnRequest);
adminRouter.post('/:id/resolve', authenticate, authorize('admin'), returnController.resolveEscalation);

module.exports = {
    customerRouter,
    partnerRouter,
    adminRouter,
};
