import api from "./api";

export interface Shipper {
    id: string;
    user_id: string;
    status: 'available' | 'busy' | 'offline';
    current_lat: number | null;
    current_lng: number | null;
    total_deliveries: number;
    success_rate: number;
    rating: number;
    created_at: string;
    updated_at: string;
    // Relations
    user?: {
        id: string;
        full_name: string;
        phone: string;
        avatar_url: string | null;
        vehicle_type: string | null;
        vehicle_plate: string | null;
    };
}

export interface Shipment {
    id: string;
    sub_order_id: string;
    shipper_id: string | null;
    status: 'pending' | 'assigned' | 'picked_up' | 'delivering' | 'delivered' | 'failed';
    pickup_address: string;
    pickup_lat: number | null;
    pickup_lng: number | null;
    delivery_address: string;
    delivery_lat: number | null;
    delivery_lng: number | null;
    distance_km: number | null;
    estimated_duration_minutes: number | null;
    actual_pickup_time: string | null;
    actual_delivery_time: string | null;
    proof_of_delivery: string | null;
    failure_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface LocationUpdate {
    lat: number;
    lng: number;
    timestamp?: string;
}

export const shipperService = {
    // ============================================
    // ADMIN OPERATIONS
    // ============================================

    // Get all shippers (Admin)
    getAllShippers: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get("/shippers", { params });
        return response.data;
    },

    // Get shipper by ID
    getShipperById: async (id: string) => {
        const response = await api.get(`/shippers/${id}`);
        return response.data;
    },

    // Update shipper status (Admin)
    updateShipperStatus: async (id: string, status: string) => {
        const response = await api.patch(`/shippers/${id}/status`, { status });
        return response.data;
    },

    // ============================================
    // SHIPPER OPERATIONS
    // ============================================

    // Get my shipments (Shipper)
    getMyShipments: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get("/shipments", { params });
        return response.data;
    },

    // Get shipment by ID
    getShipmentById: async (id: string) => {
        const response = await api.get(`/shipments/${id}`);
        return response.data;
    },

    // Update shipment status
    updateShipmentStatus: async (id: string, status: string, data?: { proofOfDelivery?: string; failureReason?: string }) => {
        const response = await api.patch(`/shipments/${id}/status`, { status, ...data });
        return response.data;
    },

    // Update location (Shipper)
    updateLocation: async (shipmentId: string, location: LocationUpdate) => {
        const response = await api.post(`/shipments/${shipmentId}/track`, location);
        return response.data;
    },

    // Get current location
    getCurrentLocation: async (shipmentId: string) => {
        const response = await api.get(`/shipments/${shipmentId}/location`);
        return response.data;
    },

    // ============================================
    // DISTANCE/ETA OPERATIONS
    // ============================================

    // Calculate distance and ETA
    calculateDistance: async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
        const response = await api.get("/shipping/distance", {
            params: { fromLat, fromLng, toLat, toLng }
        });
        return response.data;
    },

    // ============================================
    // SHIPPER PROFILE OPERATIONS
    // ============================================

    // Get my profile (Shipper)
    getMyProfile: async () => {
        const response = await api.get("/shippers/me");
        return response.data;
    },

    // Update availability status (Shipper)
    updateAvailability: async (status: 'available' | 'busy' | 'offline') => {
        const response = await api.patch("/shippers/me/status", { status });
        return response.data;
    },

    // Update current location (Shipper - for availability)
    updateCurrentLocation: async (lat: number, lng: number) => {
        const response = await api.patch("/shippers/me/location", { lat, lng });
        return response.data;
    },
};
