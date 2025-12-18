/**
 * Return Request Service
 * Business logic for product return/refund requests
 * 
 * Shopee-like return flow:
 * 1. Customer creates return request (within 7-15 days after delivery)
 * 2. Shop has 3 days to respond (approve/reject)
 * 3. If shop doesn't respond, auto-approve
 * 4. If rejected, customer can escalate to Admin
 * 5. If approved, customer ships return within 7 days
 * 6. Shop confirms receipt
 * 7. Refund processed
 */

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../../shared/utils/error.util');
const { v4: uuidv4 } = require('uuid');

// Return window in days (Shopee: 7-15 days depending on category)
const RETURN_WINDOW_DAYS = 15;

// Shop response deadline in days
const SHOP_RESPONSE_DEADLINE_DAYS = 3;

// Customer shipping deadline after approval
const CUSTOMER_SHIP_DEADLINE_DAYS = 7;

// Valid reasons for return (matching Shopee)
const RETURN_REASONS = {
    not_received: 'Chưa nhận được hàng',
    damaged: 'Hàng bị hư hỏng/vỡ',
    wrong_item: 'Giao sai sản phẩm',
    not_as_described: 'Không đúng mô tả/hình ảnh',
    defective: 'Sản phẩm lỗi/không hoạt động',
    fake_product: 'Hàng giả/nhái',
    missing_parts: 'Thiếu phụ kiện/quà tặng',
    wrong_quantity: 'Sai số lượng',
    change_mind: 'Đổi ý (không muốn mua nữa)',
    other: 'Lý do khác',
};

// Reasons that require evidence (photos/videos)
const EVIDENCE_REQUIRED_REASONS = [
    'damaged', 'wrong_item', 'not_as_described', 'defective', 
    'fake_product', 'missing_parts', 'wrong_quantity'
];

// Status transitions
const STATUS_TRANSITIONS = {
    pending: ['approved', 'rejected', 'cancelled', 'escalated'],
    approved: ['shipping', 'cancelled'],
    rejected: ['escalated', 'cancelled'], // Customer can escalate to Admin
    escalated: ['approved', 'rejected'], // Admin decides
    shipping: ['received'],
    received: ['refunding', 'rejected'], // Shop can reject if item condition is bad
    refunding: ['refunded'],
    refunded: ['completed'],
    completed: [], // Final state
    cancelled: [], // Final state
};

// ============================================
// CREATE RETURN REQUEST
// ============================================

/**
 * Create a return request
 * @param {string} customerId - Customer user ID
 * @param {object} data - Return request data
 * @returns {Promise<object>}
 */
async function createReturnRequest(customerId, data) {
    const { subOrderId, reason, reasonDetail, requestType, items, evidenceUrls } = data;

    // 1. Validate sub-order exists and belongs to customer
    const { data: subOrder, error: subOrderError } = await supabaseAdmin
        .from('sub_orders')
        .select(`
            *,
            orders!inner(id, customer_id, status),
            shops(id, shop_name),
            shipments(delivered_at)
        `)
        .eq('id', subOrderId)
        .single();

    if (subOrderError || !subOrder) {
        throw new NotFoundError('Sub-order not found');
    }

    if (subOrder.orders.customer_id !== customerId) {
        throw new ForbiddenError('You can only request returns for your own orders');
    }

    // 2. Validate sub-order status (must be delivered)
    if (!['delivered', 'completed'].includes(subOrder.status)) {
        throw new ValidationError('Can only request return for delivered orders');
    }

    // 3. Check return window (15 days from delivery)
    const shipment = subOrder.shipments?.[0];
    if (shipment?.delivered_at) {
        const deliveredAt = new Date(shipment.delivered_at);
        const now = new Date();
        const daysSinceDelivery = Math.floor((now - deliveredAt) / (1000 * 60 * 60 * 24));
        
        if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
            throw new ValidationError(`Đã quá thời hạn yêu cầu trả hàng (${RETURN_WINDOW_DAYS} ngày kể từ khi nhận hàng)`);
        }
    }

    // 4. Validate evidence for certain reasons
    if (EVIDENCE_REQUIRED_REASONS.includes(reason) && (!evidenceUrls || evidenceUrls.length === 0)) {
        throw new ValidationError('Vui lòng cung cấp hình ảnh/video minh chứng cho lý do này');
    }

    // 5. Check if return request already exists
    const { count: existingCount } = await supabaseAdmin
        .from('return_requests')
        .select('*', { count: 'exact', head: true })
        .eq('sub_order_id', subOrderId)
        .not('status', 'in', '("cancelled","rejected")');

    if (existingCount > 0) {
        throw new ValidationError('A return request already exists for this order');
    }

    // 6. Get order items for this sub-order
    const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select(`
            *,
            products(id, name, images),
            product_variants(id, name, sku)
        `)
        .eq('sub_order_id', subOrderId);

    // 7. Calculate refund amount
    let refundAmount = 0;
    const returnItems = [];

    if (items && items.length > 0) {
        // Partial return - specific items
        for (const item of items) {
            const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
            if (!orderItem) {
                throw new ValidationError(`Order item ${item.orderItemId} not found`);
            }
            const quantity = item.quantity || orderItem.quantity;
            const totalPrice = (orderItem.unit_price * quantity);
            refundAmount += totalPrice;
            
            returnItems.push({
                order_item_id: orderItem.id,
                product_id: orderItem.product_id,
                variant_id: orderItem.variant_id,
                quantity,
                unit_price: orderItem.unit_price,
                total_price: totalPrice,
                item_reason: item.reason,
                item_evidence_urls: item.evidenceUrls,
            });
        }
    } else {
        // Full return - all items
        for (const orderItem of orderItems) {
            refundAmount += parseFloat(orderItem.total_price);
            returnItems.push({
                order_item_id: orderItem.id,
                product_id: orderItem.product_id,
                variant_id: orderItem.variant_id,
                quantity: orderItem.quantity,
                unit_price: orderItem.unit_price,
                total_price: orderItem.total_price,
            });
        }
    }

    // 8. Create return request
    const returnRequestId = uuidv4();
    
    // Calculate expiry date (3 days for shop to respond)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHOP_RESPONSE_DEADLINE_DAYS);
    
    const { data: returnRequest, error: createError } = await supabaseAdmin
        .from('return_requests')
        .insert({
            id: returnRequestId,
            order_id: subOrder.order_id,
            sub_order_id: subOrderId,
            customer_id: customerId,
            shop_id: subOrder.shop_id,
            reason,
            reason_detail: reasonDetail,
            request_type: requestType || 'return',
            refund_amount: refundAmount,
            evidence_urls: evidenceUrls || [],
            status: 'pending',
            expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

    if (createError) {
        throw new Error(`Failed to create return request: ${createError.message}`);
    }

    // 9. Create return request items with product info
    for (const item of returnItems) {
        const orderItem = orderItems.find(oi => oi.id === item.order_item_id);
        await supabaseAdmin
            .from('return_request_items')
            .insert({
                id: uuidv4(),
                return_request_id: returnRequestId,
                ...item,
                product_name: orderItem?.products?.name,
                product_image: orderItem?.products?.images?.[0],
                variant_name: orderItem?.product_variants?.name,
            });
    }

    // 10. Log history
    await logHistory(returnRequestId, null, 'pending', 'customer', customerId, 'Yêu cầu trả hàng được tạo');

    // 11. Update sub-order status
    await supabaseAdmin
        .from('sub_orders')
        .update({ status: 'return_requested' })
        .eq('id', subOrderId);

    // 12. TODO: Notify shop about return request via RabbitMQ

    return serializeReturnRequest(returnRequest);
}

// ============================================
// ESCALATE TO ADMIN
// ============================================

/**
 * Escalate return request to Admin (when shop rejects)
 * @param {string} returnRequestId - Return request ID
 * @param {string} customerId - Customer ID
 * @param {object} data - Escalation data
 * @returns {Promise<object>}
 */
async function escalateToAdmin(returnRequestId, customerId, data = {}) {
    const returnRequest = await getReturnRequestById(returnRequestId);
    
    if (!returnRequest) {
        throw new NotFoundError('Return request not found');
    }

    if (returnRequest.customerId !== customerId) {
        throw new ForbiddenError('You can only escalate your own return requests');
    }

    // Can only escalate if rejected
    if (returnRequest.status !== 'rejected') {
        throw new ValidationError('Chỉ có thể khiếu nại khi yêu cầu bị từ chối');
    }

    const { data: updated, error } = await supabaseAdmin
        .from('return_requests')
        .update({
            status: 'escalated',
            escalated_at: new Date().toISOString(),
            escalation_reason: data.reason,
            escalation_evidence_urls: data.evidenceUrls || [],
        })
        .eq('id', returnRequestId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to escalate return request: ${error.message}`);
    }

    await logHistory(returnRequestId, 'rejected', 'escalated', 'customer', customerId, data.reason || 'Khách hàng khiếu nại lên Admin');

    // TODO: Notify Admin about escalation

    return serializeReturnRequest(updated);
}

// ============================================
// ADMIN RESOLVE ESCALATION
// ============================================

/**
 * Admin resolves escalated return request
 * @param {string} returnRequestId - Return request ID
 * @param {string} adminId - Admin user ID
 * @param {string} decision - 'approved' or 'rejected'
 * @param {object} data - Resolution data
 * @returns {Promise<object>}
 */
async function resolveEscalation(returnRequestId, adminId, decision, data = {}) {
    const returnRequest = await getReturnRequestById(returnRequestId);
    
    if (!returnRequest) {
        throw new NotFoundError('Return request not found');
    }

    if (returnRequest.status !== 'escalated') {
        throw new ValidationError('Return request is not escalated');
    }

    if (!['approved', 'rejected'].includes(decision)) {
        throw new ValidationError('Invalid decision');
    }

    const updateData = {
        status: decision,
        admin_note: data.note,
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
    };

    if (decision === 'approved') {
        updateData.shop_response = 'Admin đã duyệt yêu cầu trả hàng';
    }

    const { data: updated, error } = await supabaseAdmin
        .from('return_requests')
        .update(updateData)
        .eq('id', returnRequestId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to resolve escalation: ${error.message}`);
    }

    await logHistory(returnRequestId, 'escalated', decision, 'admin', adminId, data.note);

    // Update sub-order status
    if (decision === 'approved') {
        await supabaseAdmin
            .from('sub_orders')
            .update({ status: 'return_approved' })
            .eq('id', returnRequest.subOrderId);
    }

    // TODO: Notify customer and shop about resolution

    return serializeReturnRequest(updated);
}

// ============================================
// UPDATE STATUS
// ============================================

/**
 * Update return request status (Shop)
 * @param {string} returnRequestId - Return request ID
 * @param {string} shopId - Shop ID (for authorization)
 * @param {string} newStatus - New status
 * @param {object} data - Additional data
 * @returns {Promise<object>}
 */
async function updateStatusByShop(returnRequestId, shopId, newStatus, data = {}) {
    const returnRequest = await getReturnRequestById(returnRequestId);
    
    if (!returnRequest) {
        throw new NotFoundError('Return request not found');
    }

    if (returnRequest.shopId !== shopId) {
        throw new ForbiddenError('You can only update your own return requests');
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[returnRequest.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
        throw new ValidationError(`Cannot transition from ${returnRequest.status} to ${newStatus}`);
    }

    const updateData = { status: newStatus };

    if (newStatus === 'approved') {
        updateData.shop_response = data.response || 'Đồng ý yêu cầu trả hàng';
        updateData.shop_responded_at = new Date().toISOString();
        updateData.shop_responded_by = data.respondedBy;
    } else if (newStatus === 'rejected') {
        if (!data.response) {
            throw new ValidationError('Rejection reason is required');
        }
        updateData.shop_response = data.response;
        updateData.shop_responded_at = new Date().toISOString();
        updateData.shop_responded_by = data.respondedBy;
    } else if (newStatus === 'received') {
        updateData.received_at = new Date().toISOString();
    } else if (newStatus === 'refunded') {
        updateData.refunded_at = new Date().toISOString();
        updateData.refund_transaction_id = data.transactionId;
    }

    const { data: updated, error } = await supabaseAdmin
        .from('return_requests')
        .update(updateData)
        .eq('id', returnRequestId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update return request: ${error.message}`);
    }

    // Log history
    await logHistory(returnRequestId, returnRequest.status, newStatus, 'shop', data.respondedBy, data.response);

    // Update sub-order status based on return status
    if (newStatus === 'approved') {
        await supabaseAdmin
            .from('sub_orders')
            .update({ status: 'return_approved' })
            .eq('id', returnRequest.subOrderId);
    } else if (newStatus === 'refunded' || newStatus === 'completed') {
        await supabaseAdmin
            .from('sub_orders')
            .update({ status: 'returned' })
            .eq('id', returnRequest.subOrderId);
    }

    return serializeReturnRequest(updated);
}

/**
 * Update return request status (Customer)
 * @param {string} returnRequestId - Return request ID
 * @param {string} customerId - Customer ID
 * @param {string} newStatus - New status
 * @param {object} data - Additional data
 * @returns {Promise<object>}
 */
async function updateStatusByCustomer(returnRequestId, customerId, newStatus, data = {}) {
    const returnRequest = await getReturnRequestById(returnRequestId);
    
    if (!returnRequest) {
        throw new NotFoundError('Return request not found');
    }

    if (returnRequest.customerId !== customerId) {
        throw new ForbiddenError('You can only update your own return requests');
    }

    // Customer can only cancel or update shipping info
    if (newStatus === 'cancelled') {
        if (!['pending', 'approved'].includes(returnRequest.status)) {
            throw new ValidationError('Cannot cancel at this stage');
        }
    } else if (newStatus === 'shipping') {
        if (returnRequest.status !== 'approved') {
            throw new ValidationError('Return must be approved before shipping');
        }
        if (!data.trackingNumber) {
            throw new ValidationError('Tracking number is required');
        }
    } else {
        throw new ValidationError('Invalid status update');
    }

    const updateData = { status: newStatus };

    if (newStatus === 'shipping') {
        updateData.return_tracking_number = data.trackingNumber;
        updateData.return_shipper = data.shipper;
        updateData.shipped_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabaseAdmin
        .from('return_requests')
        .update(updateData)
        .eq('id', returnRequestId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update return request: ${error.message}`);
    }

    await logHistory(returnRequestId, returnRequest.status, newStatus, 'customer', customerId, data.note);

    return serializeReturnRequest(updated);
}

// ============================================
// QUERIES
// ============================================

/**
 * Get return request by ID
 * @param {string} id - Return request ID
 * @returns {Promise<object|null>}
 */
async function getReturnRequestById(id) {
    const { data, error } = await supabaseAdmin
        .from('return_requests')
        .select(`
            *,
            shops(id, shop_name, logo_url),
            return_request_items(
                *,
                products(id, name, slug),
                product_variants(id, name, sku)
            )
        `)
        .eq('id', id)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to get return request: ${error.message}`);
    }

    return data ? serializeReturnRequest(data) : null;
}

/**
 * Get return requests for customer
 * @param {string} customerId - Customer ID
 * @param {object} options - Filter options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getCustomerReturnRequests(customerId, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
        .from('return_requests')
        .select(`
            *,
            shops(id, shop_name, logo_url)
        `, { count: 'exact' })
        .eq('customer_id', customerId);

    if (status) {
        query = query.eq('status', status);
    }

    query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        throw new Error(`Failed to get return requests: ${error.message}`);
    }

    return {
        data: (data || []).map(serializeReturnRequest),
        count: count || 0,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

/**
 * Get return requests for shop
 * @param {string} shopId - Shop ID
 * @param {object} options - Filter options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getShopReturnRequests(shopId, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
        .from('return_requests')
        .select(`
            *,
            users!return_requests_customer_id_fkey(id, full_name, email, phone),
            return_request_items(*)
        `, { count: 'exact' })
        .eq('shop_id', shopId);

    if (status) {
        query = query.eq('status', status);
    }

    query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        throw new Error(`Failed to get return requests: ${error.message}`);
    }

    return {
        data: (data || []).map(serializeReturnRequest),
        count: count || 0,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

/**
 * Get escalated return requests (Admin)
 * @param {object} options - Filter options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getEscalatedReturnRequests(options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
        .from('return_requests')
        .select(`
            *,
            users!return_requests_customer_id_fkey(id, full_name, email, phone),
            shops(id, shop_name, logo_url),
            return_request_items(*)
        `, { count: 'exact' });

    if (status === 'escalated') {
        query = query.eq('status', 'escalated');
    } else if (status === 'all') {
        // Get all escalated or resolved by admin
        query = query.or('status.eq.escalated,resolved_by.not.is.null');
    }

    query = query
        .order('escalated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        throw new Error(`Failed to get escalated return requests: ${error.message}`);
    }

    return {
        data: (data || []).map(serializeReturnRequest),
        count: count || 0,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

// ============================================
// HELPERS
// ============================================

async function logHistory(returnRequestId, fromStatus, toStatus, actorType, actorId, note) {
    await supabaseAdmin
        .from('return_request_history')
        .insert({
            id: uuidv4(),
            return_request_id: returnRequestId,
            from_status: fromStatus,
            to_status: toStatus,
            actor_type: actorType,
            actor_id: actorId,
            note,
        });
}

function serializeReturnRequest(rr) {
    if (!rr) return null;
    return {
        id: rr.id,
        requestNumber: rr.request_number,
        orderId: rr.order_id,
        subOrderId: rr.sub_order_id,
        customerId: rr.customer_id,
        shopId: rr.shop_id,
        reason: rr.reason,
        reasonLabel: RETURN_REASONS[rr.reason] || rr.reason,
        reasonDetail: rr.reason_detail,
        requestType: rr.request_type,
        status: rr.status,
        refundAmount: parseFloat(rr.refund_amount),
        refundShipping: rr.refund_shipping,
        evidenceUrls: rr.evidence_urls || [],
        shopResponse: rr.shop_response,
        shopRespondedAt: rr.shop_responded_at,
        returnTrackingNumber: rr.return_tracking_number,
        returnShipper: rr.return_shipper,
        shippedAt: rr.shipped_at,
        receivedAt: rr.received_at,
        refundedAt: rr.refunded_at,
        expiresAt: rr.expires_at,
        // Escalation info
        escalatedAt: rr.escalated_at,
        escalationReason: rr.escalation_reason,
        escalationEvidenceUrls: rr.escalation_evidence_urls || [],
        adminNote: rr.admin_note,
        resolvedBy: rr.resolved_by,
        resolvedAt: rr.resolved_at,
        createdAt: rr.created_at,
        updatedAt: rr.updated_at,
        shop: rr.shops ? {
            id: rr.shops.id,
            name: rr.shops.shop_name,
            logoUrl: rr.shops.logo_url,
        } : null,
        customer: rr.users ? {
            id: rr.users.id,
            name: rr.users.full_name,
            email: rr.users.email,
            phone: rr.users.phone,
        } : null,
        items: rr.return_request_items?.map(item => ({
            id: item.id,
            orderItemId: item.order_item_id,
            productId: item.product_id,
            variantId: item.variant_id,
            productName: item.product_name,
            productImage: item.product_image,
            variantName: item.variant_name,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price),
            totalPrice: parseFloat(item.total_price),
            itemReason: item.item_reason,
            itemEvidenceUrls: item.item_evidence_urls || [],
            product: item.products ? {
                id: item.products.id,
                name: item.products.name,
                slug: item.products.slug,
            } : null,
            variant: item.product_variants ? {
                id: item.product_variants.id,
                name: item.product_variants.name,
                sku: item.product_variants.sku,
            } : null,
        })) || [],
    };
}

module.exports = {
    RETURN_REASONS,
    EVIDENCE_REQUIRED_REASONS,
    RETURN_WINDOW_DAYS,
    createReturnRequest,
    updateStatusByShop,
    updateStatusByCustomer,
    escalateToAdmin,
    resolveEscalation,
    getReturnRequestById,
    getCustomerReturnRequests,
    getShopReturnRequests,
    getEscalatedReturnRequests,
};
