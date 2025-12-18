import api from "./api";

export interface Banner {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string;
    linkUrl: string | null;
    linkText: string;
    position: number;
    isActive?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export const bannerService = {
    // Get active banners (public)
    getActiveBanners: async (): Promise<Banner[]> => {
        const response = await api.get("/banners/public");
        return response.data?.banners || [];
    },

    // Admin: Get all banners
    getAllBanners: async (): Promise<Banner[]> => {
        const response = await api.get("/banners");
        return response.data?.banners || [];
    },

    // Admin: Create banner
    createBanner: async (data: Partial<Banner>): Promise<Banner> => {
        const response = await api.post("/banners", data);
        return response.data?.banner;
    },

    // Admin: Update banner
    updateBanner: async (id: string, data: Partial<Banner>): Promise<Banner> => {
        const response = await api.put(`/banners/${id}`, data);
        return response.data?.banner;
    },

    // Admin: Delete banner
    deleteBanner: async (id: string): Promise<void> => {
        await api.delete(`/banners/${id}`);
    },
};
