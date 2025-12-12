import api from "./api";

export interface Address {
    id: string;
    name: string;
    phone: string;
    province: string | null;
    district: string | null;
    ward: string | null;
    addressLine: string;
    fullAddress: string | null;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAddressData {
    name: string;
    phone: string;
    province?: string;
    district?: string;
    ward?: string;
    addressLine: string;
    fullAddress?: string;
    isDefault?: boolean;
}

export const addressService = {
    // Get user's addresses
    getAddresses: async (): Promise<Address[]> => {
        const response = await api.get("/addresses");
        return response.data;
    },

    // Get address by ID
    getAddressById: async (id: string): Promise<Address> => {
        const response = await api.get(`/addresses/${id}`);
        return response.data;
    },

    // Create new address
    createAddress: async (data: CreateAddressData): Promise<Address> => {
        const response = await api.post("/addresses", data);
        return response.data;
    },

    // Update address
    updateAddress: async (id: string, data: Partial<CreateAddressData>): Promise<Address> => {
        const response = await api.put(`/addresses/${id}`, data);
        return response.data;
    },

    // Delete address
    deleteAddress: async (id: string): Promise<void> => {
        await api.delete(`/addresses/${id}`);
    },

    // Set as default address
    setDefaultAddress: async (id: string): Promise<Address> => {
        const response = await api.post(`/addresses/${id}/default`);
        return response.data;
    },
};
