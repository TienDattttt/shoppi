import api from "./api";

export interface FlashSale {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    startTime: string;
    endTime: string;
    status: "draft" | "scheduled" | "active" | "ended" | "cancelled";
    maxProducts: number;
    bannerUrl: string | null;
    isFeatured: boolean;
    createdAt: string;
    products?: FlashSaleProduct[];
}

export interface FlashSaleProduct {
    id: string;
    flashSaleId: string;
    productId: string;
    variantId: string | null;
    originalPrice: number;
    flashPrice: number;
    discountPercent: number;
    flashStock: number;
    soldCount: number;
    remainingStock: number;
    limitPerUser: number;
    isActive: boolean;
    product: {
        id: string;
        name: string;
        slug: string;
        basePrice: number;
        shortDescription?: string;
        avgRating?: number;
        reviewCount?: number;
        totalSold?: number;
    } | null;
}

export const flashSaleService = {
    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    // Get active flash sales
    getActiveFlashSales: async () => {
        const response = await api.get("/flash-sales/active");
        return response.data;
    },

    // Get flash sale products
    getFlashSaleProducts: async (flashSaleId: string) => {
        const response = await api.get(`/flash-sales/${flashSaleId}/products`);
        return response.data;
    },

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    // List flash sales
    listFlashSales: async (params?: { status?: string; isFeatured?: boolean; page?: number; limit?: number }) => {
        const response = await api.get("/admin/flash-sales", { params });
        return response.data;
    },

    // Get flash sale by ID
    getFlashSale: async (id: string) => {
        const response = await api.get(`/admin/flash-sales/${id}`);
        return response.data;
    },

    // Create flash sale
    createFlashSale: async (data: {
        name: string;
        description?: string;
        startTime: string;
        endTime: string;
        maxProducts?: number;
        bannerUrl?: string;
        isFeatured?: boolean;
    }) => {
        const response = await api.post("/admin/flash-sales", data);
        return response.data;
    },

    // Update flash sale
    updateFlashSale: async (id: string, data: Partial<{
        name: string;
        description: string;
        startTime: string;
        endTime: string;
        maxProducts: number;
        bannerUrl: string;
        isFeatured: boolean;
        status: string;
    }>) => {
        const response = await api.put(`/admin/flash-sales/${id}`, data);
        return response.data;
    },

    // Delete flash sale
    deleteFlashSale: async (id: string) => {
        const response = await api.delete(`/admin/flash-sales/${id}`);
        return response.data;
    },

    // Add product to flash sale
    addProduct: async (flashSaleId: string, data: {
        productId: string;
        variantId?: string;
        originalPrice: number;
        flashPrice: number;
        flashStock: number;
        limitPerUser?: number;
    }) => {
        const response = await api.post(`/admin/flash-sales/${flashSaleId}/products`, data);
        return response.data;
    },

    // Update flash sale product
    updateProduct: async (flashSaleId: string, productId: string, data: {
        flashPrice?: number;
        flashStock?: number;
        limitPerUser?: number;
        isActive?: boolean;
    }) => {
        const response = await api.put(`/admin/flash-sales/${flashSaleId}/products/${productId}`, data);
        return response.data;
    },

    // Remove product from flash sale
    removeProduct: async (flashSaleId: string, productId: string) => {
        const response = await api.delete(`/admin/flash-sales/${flashSaleId}/products/${productId}`);
        return response.data;
    },
};
