import api from "./api";

// Order status types
export type OrderStatus = 'pending_payment' | 'payment_failed' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
export type SubOrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready_to_ship' | 'shipping' | 'delivered' | 'completed' | 'cancelled' | 'return_requested' | 'return_approved' | 'returned' | 'refunded';

export interface OrderItem {
    id: string;
    productId: string;
    variantId: string;
    productName: string;
    variantName: string | null;
    sku: string | null;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    imageUrl: string | null;
}

export interface ShopInfo {
    id: string;
    shop_name: string;
    logo_url: string | null;
    partner_id: string; // partnerId
}

export interface SubOrder {
    id: string;
    orderId: string;
    shopId: string;
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    status: SubOrderStatus;
    trackingNumber: string | null;
    shipperId: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    items: OrderItem[];
    shops?: ShopInfo;
    order?: {
        orderNumber: string;
        shippingName: string;
        shippingPhone: string;
        shippingAddress: string;
        paymentMethod: string;
        paymentStatus: string;
    };
}

export interface Order {
    id: string;
    orderNumber: string;
    userId: string;
    subtotal: number;
    shippingTotal: number;
    discountTotal: number;
    grandTotal: number;
    status: OrderStatus;
    paymentMethod: string;
    paymentStatus: string;
    paidAt: string | null;
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    customerNote: string | null;
    cancelReason: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    cancelledAt: string | null;
    subOrders: SubOrder[];
}

export interface CheckoutData {
    cartItemIds: string[];
    shippingAddressId: string;
    paymentMethod: 'cod' | 'momo' | 'vnpay' | 'zalopay';
    platformVoucherCode?: string;
    voucherCode?: string; // Alias for platformVoucherCode
    shopVouchers?: Record<string, string>;
    customerNote?: string;
}

export interface CheckoutResponse {
    order: Order;
    payment: {
        paymentId?: string;
        payUrl?: string;
        provider?: string;
        expiresAt?: string;
    } | null;
}

export interface PaymentSession {
    paymentId: string;
    payUrl: string;
    provider: string;
    expiresAt: string;
}

export const orderService = {
    // Checkout - create order
    checkout: async (data: CheckoutData): Promise<CheckoutResponse> => {
        const response = await api.post("/orders/checkout", data);
        return response.data;
    },

    // Get user's orders
    getOrders: async (params?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{ orders: Order[]; pagination: any }> => {
        const response = await api.get("/orders", { params });
        return response.data;
    },

    // Get order by ID
    getOrderById: async (orderId: string): Promise<Order> => {
        const response = await api.get(`/orders/${orderId}`);
        return response.data;
    },

    // Cancel order
    cancelOrder: async (orderId: string, reason: string): Promise<Order> => {
        const response = await api.post(`/orders/${orderId}/cancel`, { reason });
        return response.data;
    },

    // Confirm receipt
    confirmReceipt: async (orderId: string): Promise<Order> => {
        const response = await api.post(`/orders/${orderId}/confirm-receipt`);
        return response.data;
    },

    // Request return
    requestReturn: async (orderId: string, data: {
        reason: string;
        description?: string;
        images?: string[];
    }): Promise<any> => {
        const response = await api.post(`/orders/${orderId}/return`, data);
        return response.data;
    },

    // Create payment session
    createPaymentSession: async (orderId: string, provider: string, returnUrl?: string): Promise<PaymentSession> => {
        const response = await api.post("/payments/create-session", {
            orderId,
            provider,
            returnUrl,
        });
        return response.data;
    },

    // Get payment status
    getPaymentStatus: async (orderId: string): Promise<{
        orderId: string;
        paymentStatus: string;
        paymentMethod?: string;
    }> => {
        const response = await api.get(`/payments/${orderId}/status`);
        return response.data;
    },

    // Confirm payment (call after redirect from payment gateway)
    confirmPayment: async (orderId: string): Promise<{
        orderId: string;
        paymentStatus: string;
        providerTransactionId?: string;
        errorMessage?: string;
        message?: string;
    }> => {
        const response = await api.post(`/payments/${orderId}/confirm`);
        return response.data;
    },

    // ==================== PARTNER/SHOP ORDER FUNCTIONS ====================

    // Get shop orders (for partner)
    getShopOrders: async (params?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{ orders: SubOrder[]; pagination: any }> => {
        const response = await api.get("/partner/orders", { params });
        return response.data;
    },

    // Confirm order (partner)
    confirmOrder: async (subOrderId: string): Promise<SubOrder> => {
        const response = await api.post(`/partner/orders/${subOrderId}/confirm`);
        return response.data;
    },

    // Pack order / mark as processing (partner)
    packOrder: async (subOrderId: string): Promise<SubOrder> => {
        const response = await api.post(`/partner/orders/${subOrderId}/pack`);
        return response.data;
    },

    // Mark order ready to ship (partner)
    readyToShip: async (subOrderId: string): Promise<SubOrder> => {
        const response = await api.post(`/partner/orders/${subOrderId}/ready-to-ship`);
        return response.data;
    },

    // Cancel order by partner
    cancelByPartner: async (subOrderId: string, reason: string): Promise<SubOrder> => {
        const response = await api.post(`/partner/orders/${subOrderId}/cancel`, { reason });
        return response.data;
    },
};
