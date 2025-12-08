import api from "./api";

export interface Voucher {
    id: string;
    shop_id: string | null; // null = system voucher
    code: string;
    name: string;
    description: string | null;
    discount_type: 'fixed' | 'percent';
    discount_value: number;
    min_order_value: number;
    max_discount_value: number | null;
    usage_limit: number | null;
    usage_count: number;
    usage_per_user: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateVoucherData {
    code: string;
    name: string;
    description?: string;
    discount_type: 'fixed' | 'percent';
    discount_value: number;
    min_order_value?: number;
    max_discount_value?: number;
    usage_limit?: number;
    usage_per_user?: number;
    start_date: string;
    end_date: string;
    is_active?: boolean;
    shop_id?: string; // For shop vouchers
}

export interface VoucherFilters {
    shopId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

export const voucherService = {
    // ============================================
    // ADMIN OPERATIONS (System Vouchers)
    // ============================================

    // Get all vouchers (Admin)
    getAllVouchers: async (params?: VoucherFilters) => {
        const response = await api.get("/admin/vouchers", { params });
        return response.data;
    },

    // Create system voucher (Admin)
    createSystemVoucher: async (data: CreateVoucherData) => {
        const response = await api.post("/admin/vouchers", data);
        return response.data;
    },

    // Update voucher (Admin)
    updateVoucher: async (id: string, data: Partial<CreateVoucherData>) => {
        const response = await api.put(`/admin/vouchers/${id}`, data);
        return response.data;
    },

    // Delete voucher (Admin)
    deleteVoucher: async (id: string) => {
        const response = await api.delete(`/admin/vouchers/${id}`);
        return response.data;
    },

    // Toggle voucher status (Admin)
    toggleVoucherStatus: async (id: string, isActive: boolean) => {
        const response = await api.patch(`/admin/vouchers/${id}/status`, { isActive });
        return response.data;
    },

    // ============================================
    // PARTNER OPERATIONS (Shop Vouchers)
    // ============================================

    // Get shop vouchers (Partner)
    getShopVouchers: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get("/shop/vouchers", { params });
        return response.data;
    },

    // Create shop voucher (Partner)
    createShopVoucher: async (data: CreateVoucherData) => {
        const response = await api.post("/shop/vouchers", data);
        return response.data;
    },

    // Update shop voucher (Partner)
    updateShopVoucher: async (id: string, data: Partial<CreateVoucherData>) => {
        const response = await api.put(`/shop/vouchers/${id}`, data);
        return response.data;
    },

    // Delete shop voucher (Partner)
    deleteShopVoucher: async (id: string) => {
        const response = await api.delete(`/shop/vouchers/${id}`);
        return response.data;
    },

    // ============================================
    // CUSTOMER OPERATIONS
    // ============================================

    // Get available vouchers for order
    getAvailableVouchers: async (orderTotal: number) => {
        const response = await api.get("/vouchers/available", { params: { orderTotal } });
        return response.data;
    },

    // Validate voucher code
    validateVoucher: async (code: string, orderTotal: number) => {
        const response = await api.get("/vouchers/validate", { params: { code, orderTotal } });
        return response.data;
    },

    // Get voucher by ID
    getVoucherById: async (id: string) => {
        const response = await api.get(`/vouchers/${id}`);
        return response.data;
    },

    // Get voucher by code
    getVoucherByCode: async (code: string) => {
        const response = await api.get(`/vouchers/code/${code}`);
        return response.data;
    },
};
