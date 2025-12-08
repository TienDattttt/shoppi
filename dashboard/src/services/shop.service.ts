import api from "./api";

export interface Shop {
    id: string;
    partner_id: string;
    shop_name: string;
    slug: string;
    description: string | null;
    phone: string;
    email: string | null;
    address: string;
    city: string | null;
    district: string | null;
    ward: string | null;
    lat: number | null;
    lng: number | null;
    logo_url: string | null;
    banner_url: string | null;
    operating_hours: Record<string, any> | null;
    category_ids: string[];
    status: 'pending' | 'active' | 'rejected' | 'revision_required' | 'suspended';
    rating: number;
    follower_count: number;
    product_count: number;
    rejection_reason: string | null;
    approved_at: string | null;
    approved_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateShopData {
    shop_name: string;
    description?: string;
    phone: string;
    email?: string;
    address: string;
    city?: string;
    district?: string;
    ward?: string;
    logo_url?: string;
    banner_url?: string;
    operating_hours?: Record<string, any>;
    category_ids?: string[];
}

export interface ShopFilters {
    q?: string;
    city?: string;
    district?: string;
    category_id?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

export const shopService = {
    // ============================================
    // PUBLIC OPERATIONS
    // ============================================

    // List active shops
    listShops: async (filters: ShopFilters = {}) => {
        const response = await api.get("/shops", { params: filters });
        return response.data;
    },

    // Get shop by ID
    getShopById: async (id: string) => {
        const response = await api.get(`/shops/${id}`);
        return response.data;
    },

    // Get shop by slug
    getShopBySlug: async (slug: string) => {
        const response = await api.get(`/shops/slug/${slug}`);
        return response.data;
    },

    // Get follower count
    getFollowerCount: async (shopId: string) => {
        const response = await api.get(`/shops/${shopId}/followers/count`);
        return response.data;
    },

    // ============================================
    // PARTNER OPERATIONS
    // ============================================

    // Get my shop (Partner)
    getMyShop: async () => {
        const response = await api.get("/shops/me");
        return response.data;
    },

    // Create shop (Partner)
    createShop: async (data: CreateShopData) => {
        const response = await api.post("/shops", data);
        return response.data;
    },

    // Update shop (Partner)
    updateShop: async (id: string, data: Partial<CreateShopData>) => {
        const response = await api.patch(`/shops/${id}`, data);
        return response.data;
    },

    // Upload logo (Partner)
    uploadLogo: async (shopId: string, file: File) => {
        const formData = new FormData();
        formData.append('logo', file);
        
        const response = await api.post(`/shops/${shopId}/logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Upload banner (Partner)
    uploadBanner: async (shopId: string, file: File) => {
        const formData = new FormData();
        formData.append('banner', file);
        
        const response = await api.post(`/shops/${shopId}/banner`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Get shop followers (Partner/Admin)
    getShopFollowers: async (shopId: string, params?: { page?: number; limit?: number }) => {
        const response = await api.get(`/shops/${shopId}/followers`, { params });
        return response.data;
    },

    // ============================================
    // CUSTOMER OPERATIONS
    // ============================================

    // Follow shop
    followShop: async (shopId: string) => {
        const response = await api.post(`/shops/${shopId}/follow`);
        return response.data;
    },

    // Unfollow shop
    unfollowShop: async (shopId: string) => {
        const response = await api.delete(`/shops/${shopId}/follow`);
        return response.data;
    },

    // Get followed shops
    getFollowedShops: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get("/users/me/following", { params });
        return response.data;
    },

    // ============================================
    // ADMIN OPERATIONS
    // ============================================

    // Get pending shops
    getPendingShops: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get("/shops/admin/pending", { params });
        return response.data;
    },

    // Approve shop
    approveShop: async (shopId: string) => {
        const response = await api.post(`/shops/${shopId}/approve`);
        return response.data;
    },

    // Reject shop
    rejectShop: async (shopId: string, reason: string) => {
        const response = await api.post(`/shops/${shopId}/reject`, { reason });
        return response.data;
    },

    // Request revision
    requestRevision: async (shopId: string, changes: string) => {
        const response = await api.post(`/shops/${shopId}/revision`, { changes });
        return response.data;
    },

    // Get all shops (Admin)
    getAllShops: async (params?: ShopFilters) => {
        const response = await api.get("/admin/shops", { params });
        return response.data;
    },
};
