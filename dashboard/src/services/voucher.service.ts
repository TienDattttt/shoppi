import api from "./api";

export interface Voucher {
    id: string;
    code: string;
    type: 'platform' | 'shop';
    shopId: string | null;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxDiscount: number | null;
    minOrderValue: number;
    usageLimit: number | null;
    usedCount: number;
    perUserLimit: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
    estimatedDiscount?: number;
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

    // Get shop vouchers
    getShopVouchers: async (shopId: string): Promise<Voucher[]> => {
        const response = await api.get(`/vouchers/shop/${shopId}`);
        return response.data;
    },
};
