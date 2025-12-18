import api from "./api";

export interface ReturnRequest {
    id: string;
    requestNumber: string;
    orderId: string;
    subOrderId: string;
    customerId: string;
    shopId: string;
    reason: string;
    reasonLabel: string;
    reasonDetail: string | null;
    requestType: "return" | "refund_only" | "exchange";
    status: string;
    refundAmount: number;
    refundShipping: boolean;
    evidenceUrls: string[];
    shopResponse: string | null;
    shopRespondedAt: string | null;
    returnTrackingNumber: string | null;
    returnShipper: string | null;
    shippedAt: string | null;
    receivedAt: string | null;
    refundedAt: string | null;
    expiresAt: string | null;
    // Escalation fields
    escalatedAt: string | null;
    escalationReason: string | null;
    escalationEvidenceUrls: string[];
    adminNote: string | null;
    resolvedBy: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
    shop: {
        id: string;
        name: string;
        logoUrl: string | null;
    } | null;
    customer?: {
        id: string;
        name: string;
        email: string;
        phone?: string;
    } | null;
    items: ReturnRequestItem[];
}

export interface ReturnRequestItem {
    id: string;
    orderItemId: string;
    productId: string;
    variantId: string | null;
    productName: string | null;
    productImage: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    itemReason: string | null;
    itemEvidenceUrls: string[];
    product: {
        id: string;
        name: string;
        slug: string;
    } | null;
    variant: {
        id: string;
        name: string;
        sku: string;
    } | null;
}

export const returnService = {
    // ============================================
    // CUSTOMER ENDPOINTS
    // ============================================

    // Get return reasons
    getReasons: async () => {
        const response = await api.get("/returns/reasons");
        return response.data;
    },

    // Get my return requests
    getMyReturns: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get("/returns", { params });
        return response.data;
    },

    // Get return request by ID
    getReturnById: async (id: string) => {
        const response = await api.get(`/returns/${id}`);
        return response.data;
    },

    // Create return request
    createReturn: async (data: {
        subOrderId: string;
        reason: string;
        reasonDetail?: string;
        requestType?: "return" | "refund_only";
        items?: Array<{
            orderItemId: string;
            quantity?: number;
            reason?: string;
            evidenceUrls?: string[];
        }>;
        evidenceUrls?: string[];
    }) => {
        const response = await api.post("/returns", data);
        return response.data;
    },

    // Cancel return request
    cancelReturn: async (id: string, reason?: string) => {
        const response = await api.post(`/returns/${id}/cancel`, { reason });
        return response.data;
    },

    // Ship return (update tracking info)
    shipReturn: async (id: string, data: { trackingNumber: string; shipper?: string }) => {
        const response = await api.post(`/returns/${id}/ship`, data);
        return response.data;
    },

    // Escalate to Admin (when shop rejects)
    escalateReturn: async (id: string, data: { reason: string; evidenceUrls?: string[] }) => {
        const response = await api.post(`/returns/${id}/escalate`, data);
        return response.data;
    },

    // Upload evidence images
    uploadEvidence: async (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        const response = await api.post('/returns/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // ============================================
    // PARTNER ENDPOINTS
    // ============================================

    // Get shop's return requests
    getShopReturns: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get("/partner/returns", { params });
        return response.data;
    },

    // Approve return request
    approveReturn: async (id: string, response?: string) => {
        const res = await api.post(`/partner/returns/${id}/approve`, { response });
        return res.data;
    },

    // Reject return request
    rejectReturn: async (id: string, reason: string) => {
        const response = await api.post(`/partner/returns/${id}/reject`, { reason });
        return response.data;
    },

    // Confirm received return
    confirmReceived: async (id: string) => {
        const response = await api.post(`/partner/returns/${id}/receive`);
        return response.data;
    },

    // Process refund
    processRefund: async (id: string, transactionId?: string) => {
        const response = await api.post(`/partner/returns/${id}/refund`, { transactionId });
        return response.data;
    },
};
