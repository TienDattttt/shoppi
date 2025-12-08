import api from "./api";

// Order status constants
export const ORDER_STATUS = {
    PENDING_PAYMENT: 'pending_payment',
    PAYMENT_FAILED: 'payment_failed',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
} as const;

// SubOrder status constants
export const SUB_ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    READY_TO_SHIP: 'ready_to_ship',
    SHIPPING: 'shipping',
    DELIVERED: 'delivered',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    RETURN_REQUESTED: 'return_requested',
    RETURN_APPROVED: 'return_approved',
    RETURNED: 'returned',
    REFUNDED: 'refunded',
} as const;

export interface Order {
    id: string;
    user_id: string;
    status: keyof typeof ORDER_STATUS;
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    payment_method: string;
    subtotal: number;
    discount_amount: number;
    shipping_fee: number;
    total_amount: number;
    shipping_address: {
        fullName: string;
        phone: string;
        address: string;
        city: string;
        district: string;
        ward: string;
    };
    voucher_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Relations
    sub_orders?: SubOrder[];
    user?: { id: string; full_name: string; phone: string };
}

export interface SubOrder {
    id: string;
    order_id: string;
    shop_id: string;
    shipper_id: string | null;
    status: keyof typeof SUB_ORDER_STATUS;
    subtotal: number;
    shipping_fee: number;
    total_amount: number;
    shipped_at: string | null;
    delivered_at: string | null;
    created_at: string;
    // Relations
    items?: OrderItem[];
    shop?: { id: string; shop_name: string };
    tracking_events?: TrackingEvent[];
}

export interface OrderItem {
    id: string;
    sub_order_id: string;
    product_id: string;
    variant_id: string;
    product_name: string;
    variant_name: string | null;
    product_image: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
}

export interface TrackingEvent {
    id: string;
    sub_order_id: string;
    event_type: string;
    description: string;
    location: string | null;
    created_by: string;
    created_at: string;
}

export interface CartItem {
    id: string;
    cart_id: string;
    product_id: string;
    variant_id: string;
    quantity: number;
    // Relations
    product?: { id: string; name: string; base_price: number };
    variant?: { id: string; name: string; price: number; quantity: number };
}

export interface CheckoutData {
    items: Array<{ variantId: string; quantity: number }>;
    shippingAddress: {
        fullName: string;
        phone: string;
        address: string;
        city: string;
        district: string;
        ward: string;
    };
    paymentMethod: 'cod' | 'momo' | 'vnpay' | 'zalopay';
    voucherId?: string;
    notes?: string;
}

export const orderService = {
    // ============================================
    // CART OPERATIONS (Customer)
    // ============================================

    // Get cart
    getCart: async () => {
        const response = await api.get("/cart");
        return response.data;
    },

    // Add to cart
    addToCart: async (variantId: string, quantity: number) => {
        const response = await api.post("/cart/items", { variantId, quantity });
        return response.data;
    },

    // Update cart item
    updateCartItem: async (itemId: string, quantity: number) => {
        const response = await api.put(`/cart/items/${itemId}`, { quantity });
        return response.data;
    },

    // Remove from cart
    removeFromCart: async (itemId: string) => {
        const response = await api.delete(`/cart/items/${itemId}`);
        return response.data;
    },

    // ============================================
    // ORDER OPERATIONS (Customer)
    // ============================================

    // Checkout
    checkout: async (data: CheckoutData) => {
        const response = await api.post("/orders/checkout", data);
        return response.data;
    },

    // Get customer orders
    getOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get("/orders", { params });
        return response.data;
    },

    // Get order by ID
    getOrderById: async (id: string) => {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    },

    // Cancel order
    cancelOrder: async (id: string, reason: string) => {
        const response = await api.post(`/orders/${id}/cancel`, { reason });
        return response.data;
    },

    // Confirm receipt
    confirmReceipt: async (id: string) => {
        const response = await api.post(`/orders/${id}/confirm-receipt`);
        return response.data;
    },

    // Request return
    requestReturn: async (id: string, reason: string) => {
        const response = await api.post(`/orders/${id}/return`, { reason });
        return response.data;
    },

    // ============================================
    // PARTNER ORDER OPERATIONS
    // ============================================

    // Get partner orders
    getPartnerOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get("/partner/orders", { params });
        return response.data;
    },

    // Confirm order
    confirmOrder: async (subOrderId: string) => {
        const response = await api.post(`/partner/orders/${subOrderId}/confirm`);
        return response.data;
    },

    // Pack order
    packOrder: async (subOrderId: string) => {
        const response = await api.post(`/partner/orders/${subOrderId}/pack`);
        return response.data;
    },

    // Cancel by partner
    cancelByPartner: async (subOrderId: string, reason: string) => {
        const response = await api.post(`/partner/orders/${subOrderId}/cancel`, { reason });
        return response.data;
    },

    // ============================================
    // SHIPPER ORDER OPERATIONS
    // ============================================

    // Pickup order
    pickupOrder: async (subOrderId: string) => {
        const response = await api.post(`/shipper/orders/${subOrderId}/pickup`);
        return response.data;
    },

    // Deliver order
    deliverOrder: async (subOrderId: string, proofOfDelivery?: string) => {
        const response = await api.post(`/shipper/orders/${subOrderId}/deliver`, { proofOfDelivery });
        return response.data;
    },

    // Fail delivery
    failDelivery: async (subOrderId: string, reason: string) => {
        const response = await api.post(`/shipper/orders/${subOrderId}/fail`, { reason });
        return response.data;
    },

    // ============================================
    // VOUCHER OPERATIONS
    // ============================================

    // Validate voucher
    validateVoucher: async (code: string, orderTotal: number) => {
        const response = await api.get("/vouchers/validate", { params: { code, orderTotal } });
        return response.data;
    },

    // ============================================
    // ADMIN ORDER OPERATIONS
    // ============================================

    // Get all orders (Admin)
    getAllOrders: async (params?: { status?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) => {
        const response = await api.get("/admin/orders", { params });
        return response.data;
    },
};
