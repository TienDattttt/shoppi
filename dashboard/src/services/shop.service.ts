import api from "./api";
import type { Shop } from "@/types";

export const shopService = {
    getAllShops: async (params?: { search?: string }) => {
        try {
            const response = await api.get("/admin/shops", { params });
            return response.data;
        } catch (error) {
            console.error("Fetch shops error", error);
            // Fallback mock
            return {
                data: [
                    { _id: "S001", name: "Tech Store Official", ownerId: "User1", products: 120, revenue: 1200000000, status: "active", rating: 4.8 },
                    { _id: "S002", name: "Fashion Boutique", ownerId: "User2", products: 85, revenue: 540000000, status: "active", rating: 4.5 },
                    { _id: "S003", name: "Gia Dung Thong Minh", ownerId: "User3", products: 230, revenue: 890000000, status: "active", rating: 4.2 },
                    { _id: "S004", name: "My Pham Chinh Hang", ownerId: "User4", products: 45, revenue: 120000000, status: "rejected", rating: 3.5 },
                    { _id: "S005", name: "Book World", ownerId: "User5", products: 560, revenue: 2100000000, status: "active", rating: 4.9 },
                ] as Shop[],
                total: 5,
                page: 1,
                limit: 10
            };
        }
    },

    approveShop: async (id: string) => {
        try {
            const response = await api.post(`/admin/shops/${id}/approve`);
            return response.data;
        } catch (error) {
            console.error("Approve shop error", error);
            throw error;
        }
    },

    rejectShop: async (id: string, reason: string) => {
        try {
            const response = await api.post(`/admin/shops/${id}/reject`, { reason });
            return response.data;
        } catch (error) {
            console.error("Reject shop error", error);
            throw error;
        }
    },

    requestRevision: async (id: string, changes: string) => {
        try {
            const response = await api.post(`/admin/shops/${id}/revision`, { changes });
            return response.data;
        } catch (error) {
            console.error("Request revision error", error);
            throw error;
        }
    },

    updateShopStatus: async (_id: string, _status: string) => {
        // Deprecated, use specific methods above
        return new Promise((resolve) => setTimeout(resolve, 500));
    },

    getShopById: async (id: string) => {
        try {
            const response = await api.get(`/shops/${id}`);
            return response.data;
        } catch (error) {
            console.error("Fetch shop detail error", error);
            return {
                _id: id,
                name: "Tech Store Official",
                ownerId: "u123",
                description: "Best tech store in town providing high quality products.",
                address: "123 Tech Street, District 1, HCMC",
                products: 156,
                revenue: 1500000000,
                status: "active",
                rating: 4.8,
                joinDate: "2023-05-20"
            };
        }
    }
};
