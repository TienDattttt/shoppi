import api from "./api";

export interface Voucher {
    id: string;
    _id?: string; // Alias from backend
    code: string;
    name?: string;
    description?: string;
    type: 'platform' | 'shop';
    shop_id: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_discount: number | null;
    min_order_value: number;
    usage_limit: number | null;
    used_count: number;
    per_user_limit: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    estimated_discount?: number;
    is_collected?: boolean;
    // Aliases for camelCase access (from backend transform)
    status?: 'active' | 'inactive';
    shopId?: string | null;
    discountType?: 'percentage' | 'fixed' | 'percent';
    value?: number;
    maxDiscount?: number | null;
    minOrderValue?: number;
    usageLimit?: number | string | null;
    usedCount?: number;
    perUserLimit?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    createdAt?: string;
}

export interface ValidateVoucherResponse {
    voucher: Voucher;
    discount: number;
    isValid: boolean;
}

export const voucherService = {
    // Get available vouchers for user
    getAvailableVouchers: async (params?: {
        orderTotal?: number;
        shopId?: string;
    }): Promise<Voucher[]> => {
        const response = await api.get("/vouchers/available", { params });
        return response.data;
    },

    // Validate voucher code
    validateVoucher: async (code: string, orderTotal: number, shopId?: string): Promise<ValidateVoucherResponse> => {
        const response = await api.get("/vouchers/validate", {
            params: { code, orderTotal, shopId }
        });
        return response.data;
    },

    // Collect/save voucher to wallet
    collectVoucher: async (code: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post("/vouchers/collect", { code });
        return response.data;
    },

    // Get user's collected vouchers
    getMyVouchers: async (params?: {
        status?: 'active' | 'expired' | 'all';
    }): Promise<Voucher[]> => {
        const response = await api.get("/vouchers/my-vouchers", { params });
        return response.data;
    },

    // Get platform vouchers (for săn voucher page)
    getPlatformVouchers: async (): Promise<Voucher[]> => {
        const response = await api.get("/vouchers/platform");
        return response.data;
    },

    // Get shop vouchers (for customer viewing a shop)
    getShopVouchers: async (shopId?: string): Promise<{ data: Voucher[] }> => {
        // If no shopId provided, get current partner's shop vouchers
        if (!shopId) {
            const response = await api.get("/shop/vouchers");
            return response.data;
        }
        const response = await api.get(`/vouchers/shop/${shopId}`);
        return { data: response.data };
    },

    // Create shop voucher (partner)
    createShopVoucher: async (data: {
        code: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: number;
        max_discount?: number;
        min_order_value?: number;
        usage_limit?: number;
        per_user_limit?: number;
        start_date: string;
        end_date: string;
    }): Promise<Voucher> => {
        const response = await api.post("/shop/vouchers", data);
        return response.data;
    },

    // Update shop voucher (partner)
    updateShopVoucher: async (voucherId: string, data: Partial<{
        code: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: number;
        max_discount: number;
        min_order_value: number;
        usage_limit: number;
        per_user_limit: number;
        start_date: string;
        end_date: string;
        is_active: boolean;
    }>): Promise<Voucher> => {
        const response = await api.put(`/shop/vouchers/${voucherId}`, data);
        return response.data;
    },

    // Delete shop voucher (partner)
    deleteShopVoucher: async (voucherId: string): Promise<void> => {
        await api.delete(`/shop/vouchers/${voucherId}`);
    },

    // ============================================
    // ADMIN VOUCHER MANAGEMENT
    // ============================================

    // Get all vouchers (admin)
    getAllVouchers: async (params?: {
        type?: 'platform' | 'shop';
        status?: 'active' | 'inactive';
        page?: number;
        limit?: number;
    }): Promise<{ data: Voucher[]; pagination?: any }> => {
        const response = await api.get("/admin/vouchers", { params });
        return response.data;
    },

    // Create system/platform voucher (admin)
    createSystemVoucher: async (data: {
        code: string;
        name?: string;
        description?: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: number;
        max_discount?: number;
        min_order_value?: number;
        usage_limit?: number;
        per_user_limit?: number;
        start_date: string;
        end_date: string;
    }): Promise<Voucher> => {
        const response = await api.post("/admin/vouchers", data);
        return response.data;
    },

    // Update voucher (admin)
    updateVoucher: async (voucherId: string, data: Partial<{
        code: string;
        name: string;
        description: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: number;
        max_discount: number;
        min_order_value: number;
        usage_limit: number;
        per_user_limit: number;
        start_date: string;
        end_date: string;
        is_active: boolean;
    }>): Promise<Voucher> => {
        const response = await api.put(`/admin/vouchers/${voucherId}`, data);
        return response.data;
    },

    // Toggle voucher status (admin)
    toggleVoucherStatus: async (voucherId: string, status: 'active' | 'inactive'): Promise<Voucher> => {
        const response = await api.patch(`/admin/vouchers/${voucherId}/status`, { isActive: status });
        return response.data;
    },

    // Delete voucher (admin)
    deleteVoucher: async (voucherId: string): Promise<void> => {
        await api.delete(`/admin/vouchers/${voucherId}`);
    },
};
