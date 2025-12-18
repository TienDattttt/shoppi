import api from "./api";

export interface Province {
    code: string;
    name: string;
}

export interface Ward {
    code: string;
    name: string;
    districtName: string;
    provinceName: string;
    lat?: number;
    lng?: number;
}

export interface PostOffice {
    id: string;
    name: string;
    code: string;
    address: string;
    wardCode: string;
    wardName: string;
    districtName: string;
    provinceName: string;
    lat?: number;
    lng?: number;
}

export const locationService = {
    // Get all provinces
    getProvinces: async (): Promise<Province[]> => {
        const response = await api.get("/locations/provinces");
        return response.data?.provinces || response.data || [];
    },

    // Get wards by province code
    getWards: async (provinceCode: string): Promise<Ward[]> => {
        const response = await api.get("/locations/wards", {
            params: { provinceCode }
        });
        return response.data?.wards || response.data || [];
    },

    // Get post offices by ward code
    getPostOffices: async (wardCode: string): Promise<PostOffice[]> => {
        const response = await api.get("/locations/post-offices", {
            params: { wardCode }
        });
        return response.data?.postOffices || response.data || [];
    },
};
