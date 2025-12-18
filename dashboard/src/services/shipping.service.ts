import api from "./api";

export interface ShippingFeeParams {
    fromAddress: {
        lat: number;
        lng: number;
        address?: string;
        provinceCode?: string;
        wardCode?: string;
    };
    toAddress: {
        lat: number;
        lng: number;
        address?: string;
        provinceCode?: string;
        wardCode?: string;
    };
    weight?: number;
    specialHandling?: boolean;
    discount?: number;
}

export interface ShippingFeeResult {
    fee: number;
    originalFee: number;
    discount: number;
    zoneType: string;
    zoneLabel: string;
    estimatedDays: number;
    estimatedDelivery: string;
    breakdown: {
        baseFee: number;
        distanceFee: number;
        weightFee: number;
        surcharge: number;
    };
    distance?: {
        km: number;
        text: string;
    };
    duration?: {
        minutes: number;
        text: string;
    };
}

export interface ShippingZone {
    id: string;
    zoneType: string;
    zoneLabel: string;
    baseFee: number;
    perKmFee: number;
    estimatedDays: number;
    estimatedDelivery: string;
    isActive: boolean;
}

export const shippingService = {
    // Calculate shipping fee
    calculateFee: async (params: ShippingFeeParams): Promise<ShippingFeeResult> => {
        const response = await api.post("/shipping/calculate", params);
        return response.data?.data || response.data;
    },

    // Get all shipping zones with pricing
    getZones: async (): Promise<ShippingZone[]> => {
        const response = await api.get("/shipping/zones");
        return response.data?.data || response.data || [];
    },
};
