/**
 * Return Request Controller
 * API endpoints for return/refund requests
 */

const returnService = require('./services/return.service');
const { successResponse } = require('../../shared/utils/response.util');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

// ============================================
// CUSTOMER ENDPOINTS
// ============================================

/**
 * Create return request
 * POST /api/returns
 */
async function createReturnRequest(req, res, next) {
    try {
        const customerId = req.user.userId;
        const returnRequest = await returnService.createReturnRequest(customerId, req.body);
        return successResponse(res, { returnRequest }, 201);
    } catch (error) {
        next(error);
    }
}

/**
 * Get customer's return requests
 * GET /api/returns
 */
async function getMyReturnRequests(req, res, next) {
    try {
        const customerId = req.user.userId;
        const { status, page, limit } = req.query;
        const result = await returnService.getCustomerReturnRequests(customerId, {
            status,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * Get return request detail
 * GET /api/returns/:id
 */
async function getReturnRequest(req, res, next) {
    try {
        const { id } = req.params;
        const returnRequest = await returnService.getReturnRequestById(id);
        
        // Check authorization
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        if (userRole === 'customer' && returnRequest.customerId !== userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

/**
 * Cancel return request (Customer)
 * POST /api/returns/:id/cancel
 */
async function cancelReturnRequest(req, res, next) {
    try {
        const { id } = req.params;
        const customerId = req.user.userId;
        const returnRequest = await returnService.updateStatusByCustomer(id, customerId, 'cancelled', {
            note: req.body.reason || 'Khách hàng hủy yêu cầu',
        });
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

/**
 * Update shipping info (Customer)
 * POST /api/returns/:id/ship
 */
async function shipReturn(req, res, next) {
    try {
        const { id } = req.params;
        const customerId = req.user.userId;
        const { trackingNumber, shipper } = req.body;
        
        const returnRequest = await returnService.updateStatusByCustomer(id, customerId, 'shipping', {
            trackingNumber,
            shipper,
        });
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

// ============================================
// SHOP/PARTNER ENDPOINTS
// ============================================

/**
 * Get shop's return requests
 * GET /api/partner/returns
 */
async function getShopReturnRequests(req, res, next) {
    try {
        const shopId = req.shop?.id;
        if (!shopId) {
            return res.status(400).json({ message: 'Shop not found' });
        }
        
        const { status, page, limit } = req.query;
        const result = await returnService.getShopReturnRequests(shopId, {
            status,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * Approve return request (Shop)
 * POST /api/partner/returns/:id/approve
 */
async function approveReturnRequest(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop?.id;
        const userId = req.user.userId;
        
        const returnRequest = await returnService.updateStatusByShop(id, shopId, 'approved', {
            response: req.body.response || 'Đồng ý yêu cầu trả hàng',
            respondedBy: userId,
        });
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

/**
 * Reject return request (Shop)
 * POST /api/partner/returns/:id/reject
 */
async function rejectReturnRequest(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop?.id;
        const userId = req.user.userId;
        
        const returnRequest = await returnService.updateStatusByShop(id, shopId, 'rejected', {
            response: req.body.reason,
            respondedBy: userId,
        });
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

/**
 * Confirm received return (Shop)
 * POST /api/partner/returns/:id/receive
 */
async function confirmReceived(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop?.id;
        const userId = req.user.userId;
        
        const returnRequest = await returnService.updateStatusByShop(id, shopId, 'received', {
            respondedBy: userId,
        });
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

/**
 * Process refund (Shop)
 * POST /api/partner/returns/:id/refund
 */
async function processRefund(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop?.id;
        const userId = req.user.userId;
        
        // First mark as refunding
        await returnService.updateStatusByShop(id, shopId, 'refunding', {
            respondedBy: userId,
        });
        
        // Then mark as refunded (in real app, this would be after actual refund)
        const returnRequest = await returnService.updateStatusByShop(id, shopId, 'refunded', {
            respondedBy: userId,
            transactionId: req.body.transactionId || `REF-${Date.now()}`,
        });
        
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

/**
 * Get return reasons
 * GET /api/returns/reasons
 */
async function getReturnReasons(_req, res, next) {
    try {
        return successResponse(res, { reasons: returnService.RETURN_REASONS });
    } catch (error) {
        next(error);
    }
}

/**
 * Upload evidence images for return request
 * POST /api/returns/upload
 */
async function uploadEvidence(req, res, next) {
    try {
        const userId = req.user.userId;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const uploadedUrls = [];
        
        for (const file of files) {
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${userId}/${uuidv4()}.${fileExt}`;
            
            const { data, error } = await supabaseAdmin.storage
                .from('returns')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false,
                });

            if (error) {
                console.error('Upload error:', error);
                continue;
            }

            // Get public URL
            const { data: urlData } = supabaseAdmin.storage
                .from('returns')
                .getPublicUrl(fileName);

            uploadedUrls.push(urlData.publicUrl);
        }

        return successResponse(res, { urls: uploadedUrls });
    } catch (error) {
        next(error);
    }
}

/**
 * Escalate return request to Admin (Customer)
 * POST /api/returns/:id/escalate
 */
async function escalateReturnRequest(req, res, next) {
    try {
        const { id } = req.params;
        const customerId = req.user.userId;
        const { reason, evidenceUrls } = req.body;
        
        const returnRequest = await returnService.escalateToAdmin(id, customerId, {
            reason,
            evidenceUrls,
        });
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all escalated return requests (Admin)
 * GET /api/admin/returns
 */
async function getEscalatedReturns(req, res, next) {
    try {
        const { status, page, limit } = req.query;
        const result = await returnService.getEscalatedReturnRequests({
            status: status || 'escalated',
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * Resolve escalated return request (Admin)
 * POST /api/admin/returns/:id/resolve
 */
async function resolveEscalation(req, res, next) {
    try {
        const { id } = req.params;
        const adminId = req.user.userId;
        const { decision, note } = req.body;
        
        const returnRequest = await returnService.resolveEscalation(id, adminId, decision, {
            note,
        });
        return successResponse(res, { returnRequest });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    // Customer
    createReturnRequest,
    getMyReturnRequests,
    getReturnRequest,
    cancelReturnRequest,
    shipReturn,
    escalateReturnRequest,
    uploadEvidence,
    
    // Shop
    getShopReturnRequests,
    approveReturnRequest,
    rejectReturnRequest,
    confirmReceived,
    processRefund,
    
    // Admin
    getEscalatedReturns,
    resolveEscalation,
    
    // Common
    getReturnReasons,
};
