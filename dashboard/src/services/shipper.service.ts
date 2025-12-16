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

// Tracking event interface
export interface TrackingEvent {
    id: string;
    status: string;
    statusVi: string;
    description: string;
    descriptionVi: string;
    locationName?: string;
    locationAddress?: string;
    lat?: number;
    lng?: number;
    actorType: 'system' | 'shipper' | 'shop' | 'customer';
    actorName?: string;
    eventTime: string;
}

// Shipper info for tracking
export interface ShipperTrackingInfo {
    id: string;
    name: string;
    maskedPhone: string;
    avatarUrl?: string;
    vehicleType: string;
    vehiclePlate: string;
    rating: number;
    totalDeliveries?: number;
}

// Tracking response
export interface TrackingResponse {
    shipment: {
        id: string;
        trackingNumber: string;
        status: string;
        statusLabel: string;
        currentLocation?: string;
        estimatedDelivery?: string;
        deliveryAddress: string;
        deliveryAttempts: number;
        nextDeliveryAttempt?: string;
        failureReason?: string;
    };
    shipper: ShipperTrackingInfo | null;
    events: TrackingEvent[];
}

// Location response
export interface ShipperLocationResponse {
    shipmentId: string;
    trackingNumber: string;
    status: string;
    shipperLocation: {
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
        updatedAt: string;
    };
    deliveryLocation: {
        lat: number | null;
        lng: number | null;
        address: string;
    };
    pickupLocation: {
        lat: number | null;
        lng: number | null;
        address: string;
    };
    distanceKm: number | null;
    eta: string | null;
    etaRange: {
        start: string;
        end: string;
        display: string;
    } | null;
}

// Order shipments response
export interface OrderShipmentsResponse {
    orderId: string;
    totalShipments: number;
    shipments: OrderShipment[];
}

export interface OrderShipment {
    id: string;
    trackingNumber: string;
    status: string;
    statusLabel: string;
    subOrderId: string;
    shop: {
        id: string;
        name: string;
        logoUrl?: string;
    } | null;
    shipper: ShipperTrackingInfo | null;
    pickup: {
        address: string;
        contactName: string;
        contactPhone: string;
    };
    delivery: {
        address: string;
        contactName: string;
        contactPhone: string;
    };
    shippingFee: number;
    codAmount: number;
    currentLocation?: string;
    estimatedDelivery?: string;
    latestEvent: {
        status: string;
        statusVi: string;
        description: string;
        eventTime: string;
    } | null;
    timestamps: {
        created: string;
        assigned?: string;
        pickedUp?: string;
        delivered?: string;
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

    // Get pending shippers (Admin)
    getPendingShippers: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get("/shippers/pending", { params });
        return response.data;
    },

    // Approve shipper (Admin)
    approveShipper: async (id: string) => {
        const response = await api.post(`/shippers/${id}/approve`);
        return response.data;
    },

    // Reject shipper (Admin)
    rejectShipper: async (id: string, reason: string) => {
        const response = await api.post(`/shippers/${id}/reject`, { reason });
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

    // ============================================
    // TRACKING OPERATIONS (Customer)
    // ============================================

    // Get tracking history for a shipment
    getTrackingHistory: async (shipmentId: string): Promise<TrackingResponse> => {
        const response = await api.get(`/shipments/${shipmentId}/tracking`);
        return response.data.data;
    },

    // Get real-time shipper location for a shipment
    getShipmentLocation: async (shipmentId: string): Promise<ShipperLocationResponse> => {
        const response = await api.get(`/shipments/${shipmentId}/location`);
        return response.data.data;
    },

    // Get all shipments for an order (multi-shop orders)
    getOrderShipments: async (orderId: string): Promise<OrderShipmentsResponse> => {
        const response = await api.get(`/orders/${orderId}/shipments`);
        return response.data.data;
    },

    // Rate a shipment delivery
    rateShipment: async (shipmentId: string, rating: number, comment?: string) => {
        const response = await api.post(`/shipments/${shipmentId}/rate`, { rating, comment });
        return response.data;
    },

    // ============================================
    // PARTNER SHIPPING OPERATIONS
    // ============================================

    // Mark sub-order as ready to ship (Partner)
    markReadyToShip: async (subOrderId: string, pickupTimeSlot?: string) => {
        const response = await api.post(`/partner/shipping/orders/${subOrderId}/ready-to-ship`, { pickupTimeSlot });
        return response.data;
    },

    // Get partner's shipments (Partner)
    getPartnerShipments: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get("/partner/shipping/shipments", { params });
        return response.data;
    },

    // Get partner shipment by ID (Partner)
    getPartnerShipmentById: async (shipmentId: string) => {
        const response = await api.get(`/partner/shipping/shipments/${shipmentId}`);
        return response.data;
    },

    // Request pickup for a shipment (Partner)
    requestPickup: async (shipmentId: string, data: { preferredTime: string; notes?: string }) => {
        const response = await api.post(`/partner/shipping/shipments/${shipmentId}/request-pickup`, data);
        return response.data;
    },

    // Get shipping label for printing (Partner)
    getShippingLabel: async (shipmentId: string) => {
        const response = await api.get(`/partner/shipping/shipments/${shipmentId}/label`);
        return response.data;
    },
};
