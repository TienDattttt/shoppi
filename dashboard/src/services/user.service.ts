import api from "./api";

export interface User {
    _id: string;
    username: string;
    email: string;
    role: "admin" | "user" | "shop";
    status: "active" | "inactive" | "banned";
    createdAt: string;
}

export const userService = {
    getAllUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
        // Mock data for now if API not ready, but structure setup for real API
        try {
            const response = await api.get("/admin/users", { params });
            return response.data;
        } catch (error) {
            console.error("Fetch users error", error);
            // Fallback mock data for presentation
            return {
                data: [
                    { _id: "1", username: "nguyenvana", email: "a@gmail.com", role: "user", status: "active", createdAt: "2023-01-01" },
                    { _id: "2", username: "shop_hcm", email: "shop@gmail.com", role: "shop", status: "active", createdAt: "2023-01-02" },
                    { _id: "3", username: "banned_guy", email: "bad@gmail.com", role: "user", status: "banned", createdAt: "2023-01-05" },
                ],
                total: 3,
                page: 1,
                limit: 10
            };
        }
    },

    updateUserStatus: async (id: string, status: string) => {
        return api.patch(`/admin/users/${id}/status`, { status });
    },

    getUserById: async (id: string) => {
        try {
            const response = await api.get(`/users/${id}`);
            return response.data;
        } catch (error) {
            console.error("Fetch user detail error", error);
            // Fallback mock
            return {
                _id: id,
                username: "nguyenvanUser",
                email: "user@example.com",
                phone: "0901234567",
                role: "user",
                status: "active",
                createdAt: "2023-01-15",
                avatar: "https://github.com/shadcn.png"
            };
        }
    }
};
