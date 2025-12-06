import api from "./api";

export interface Voucher {
    _id: string;
    code: string;
    discountType: 'fixed' | 'percent';
    value: number;
    minOrderValue: number;
    maxDiscountValue?: number;
    startDate: string;
    endDate: string;
    usageLimit: number;
    usedCount: number;
    status: 'active' | 'inactive';
    shopId?: string; // If null, system voucher
}

export const voucherService = {
    getAllVouchers: async () => {
        try {
            const response = await api.get("/admin/vouchers");
            return response.data;
        } catch (error) {
            console.error("Fetch vouchers error", error);
            // Mock System Vouchers
            return {
                data: [
                    { _id: "v1", code: "WELCOME50", discountType: "fixed", value: 50000, minOrderValue: 200000, startDate: "2023-01-01", endDate: "2023-12-31", usageLimit: 1000, usedCount: 150, status: "active" },
                    { _id: "v2", code: "FREESHIP", discountType: "fixed", value: 30000, minOrderValue: 150000, startDate: "2023-06-01", endDate: "2023-06-30", usageLimit: 500, usedCount: 500, status: "inactive" }
                ],
                total: 2
            };
        }
    },

    getShopVouchers: async (shopId?: string) => {
        try {
            const response = await api.get("/shop/vouchers");
            return response.data;
        } catch (error) {
            // Mock Shop Vouchers
            return {
                data: [
                    { _id: "sv1", code: "SHOP10", discountType: "percent", value: 10, minOrderValue: 100000, maxDiscountValue: 50000, startDate: "2023-11-01", endDate: "2023-11-30", usageLimit: 100, usedCount: 12, status: "active", shopId: "s1" }
                ],
                total: 1
            };
        }
    },

    createVoucher: async (data: Partial<Voucher>) => {
        return api.post("/vouchers", data);
    },

    updateVoucher: async (id: string, data: Partial<Voucher>) => {
        return api.put(`/vouchers/${id}`, data);
    },

    toggleVoucherStatus: async (id: string, status: string) => {
        return api.patch(`/vouchers/${id}/status`, { status });
    }
};
