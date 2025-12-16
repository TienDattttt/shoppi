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

// Goong.io Autocomplete types
export interface AddressSuggestion {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
    types?: string[];
    compound?: {
        district: string;
        commune: string;
        province: string;
    };
}

export interface PlaceDetail {
    placeId: string;
    name: string;
    formattedAddress: string;
    lat: number;
    lng: number;
    compound?: {
        district: string;
        commune: string;
        province: string;
    };
    addressComponents?: Array<{
        longName: string;
        shortName: string;
    }>;
}

export interface GeoLocation {
    formattedAddress: string;
    lat: number;
    lng: number;
    placeId?: string;
    compound?: {
        district: string;
        commune: string;
        province: string;
    };
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

    // ========================================
    // Goong.io Address Autocomplete APIs
    // ========================================

    // Autocomplete địa chỉ
    autocomplete: async (
        query: string,
        options?: { lat?: number; lng?: number; limit?: number }
    ): Promise<AddressSuggestion[]> => {
        const params = new URLSearchParams({ q: query });
        if (options?.lat && options?.lng) {
            params.append('lat', options.lat.toString());
            params.append('lng', options.lng.toString());
        }
        if (options?.limit) {
            params.append('limit', options.limit.toString());
        }
        const response = await api.get(`/address/autocomplete?${params}`);
        return response.data?.suggestions || [];
    },

    // Lấy chi tiết địa điểm từ placeId
    getPlaceDetail: async (placeId: string): Promise<PlaceDetail | null> => {
        const response = await api.get(`/address/place/${placeId}`);
        return response.data?.place || null;
    },

    // Geocode địa chỉ thành tọa độ
    geocode: async (address: string): Promise<GeoLocation | null> => {
        const response = await api.get(`/address/geocode?address=${encodeURIComponent(address)}`);
        return response.data?.location || null;
    },

    // Reverse geocode tọa độ thành địa chỉ
    reverseGeocode: async (lat: number, lng: number): Promise<GeoLocation | null> => {
        const response = await api.get(`/address/reverse-geocode?lat=${lat}&lng=${lng}`);
        return response.data?.address || null;
    },

    // Tính khoảng cách giữa 2 điểm
    getDistance: async (
        fromLat: number,
        fromLng: number,
        toLat: number,
        toLng: number,
        vehicle: 'car' | 'bike' = 'bike'
    ): Promise<{ distanceKm: number; durationMinutes: number } | null> => {
        const params = new URLSearchParams({
            fromLat: fromLat.toString(),
            fromLng: fromLng.toString(),
            toLat: toLat.toString(),
            toLng: toLng.toString(),
            vehicle,
        });
        const response = await api.get(`/address/distance?${params}`);
        return response.data?.distance || null;
    },
};
