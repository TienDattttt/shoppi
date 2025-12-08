import api from "./api";

export interface User {
    id: string;
    email: string | null;
    phone: string | null;
    full_name: string;
    role: 'admin' | 'partner' | 'customer' | 'shipper';
    status: 'pending' | 'active' | 'inactive' | 'locked';
    avatar_url: string | null;
    business_name: string | null;
    tax_id: string | null;
    id_card_number: string | null;
    vehicle_type: string | null;
    vehicle_plate: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserFilters {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export const userService = {
    getAllUsers: async (params?: UserFilters) => {
        const response = await api.get("/admin/users", { params });
        return response.data;
    },

    getUserById: async (id: string) => {
        const response = await api.get(`/admin/users/${id}`);
        return response.data;
    },

    updateUserStatus: async (id: string, status: string) => {
        const response = await api.patch(`/admin/users/${id}/status`, { status });
        return response.data;
    },

    updateUser: async (id: string, data: { status?: string; role?: string }) => {
        const response = await api.patch(`/admin/users/${id}`, data);
        return response.data;
    },

    getPendingUsers: async (params?: { role?: string; page?: number; limit?: number }) => {
        const response = await api.get("/admin/users/pending", { params });
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get("/users/me");
        return response.data;
    },

    updateProfile: async (data: { full_name?: string; avatar_url?: string }) => {
        const response = await api.patch("/users/me", data);
        return response.data;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        const response = await api.post("/users/me/password", { currentPassword, newPassword });
        return response.data;
    },

    getAddresses: async () => {
        const response = await api.get("/users/me/addresses");
        return response.data;
    },

    addAddress: async (data: {
        fullName: string;
        phone: string;
        address: string;
        city: string;
        district: string;
        ward: string;
        isDefault?: boolean;
    }) => {
        const response = await api.post("/users/me/addresses", data);
        return response.data;
    },

    updateAddress: async (id: string, data: any) => {
        const response = await api.put(`/users/me/addresses/${id}`, data);
        return response.data;
    },

    deleteAddress: async (id: string) => {
        const response = await api.delete(`/users/me/addresses/${id}`);
        return response.data;
    },

    // Admin: Get user sessions (activity log)
    getUserSessions: async (id: string) => {
        const response = await api.get(`/admin/users/${id}/sessions`);
        return response.data;
    },

    // Admin: Get user orders
    getUserOrders: async (id: string, params?: { page?: number; limit?: number }) => {
        const response = await api.get(`/admin/users/${id}/orders`, { params });
        return response.data;
    },
};
