import api from "./api";

export interface PostOffice {
  id: string;
  code: string;
  name: string;
  name_vi: string;
  address: string;
  district: string;
  city: string;
  region: 'north' | 'central' | 'south';
  lat: number | null;
  lng: number | null;
  office_type: 'local' | 'regional';
  parent_office_id: string | null;
  province_code: string | null;
  ward_code: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  shipperCount?: number;
  parent?: {
    id: string;
    code: string;
    name_vi: string;
  };
}

export interface PostOfficeStats {
  totalShippers: number;
  onlineShippers: number;
  availableShippers: number;
  totalPickups: number;
  totalDeliveries: number;
  shippers: Array<{
    id: string;
    name: string;
    phone: string;
    pickupCount: number;
    deliveryCount: number;
    isOnline: boolean;
    isAvailable: boolean;
  }>;
}

export interface Province {
  code: string;
  name: string;
  region: string;
  lat: number | null;
  lng: number | null;
}

export interface Ward {
  code: string;
  name: string;
  province_code: string;
  ward_type: 'phuong' | 'xa';
  lat: number | null;
  lng: number | null;
}

export interface PostOfficeFilters {
  page?: number;
  limit?: number;
  city?: string;
  district?: string;
  region?: string;
  office_type?: string;
  search?: string;
}

export interface CreatePostOfficeData {
  code: string;
  name?: string;
  name_vi: string;
  address: string;
  district?: string;
  city?: string;
  region?: string;
  lat?: number;
  lng?: number;
  office_type: 'local' | 'regional';
  parent_office_id?: string;
  province_code?: string;
  district_code?: string;
  phone?: string;
}

export const postOfficeService = {
  // Get all post offices with filters
  getPostOffices: async (filters?: PostOfficeFilters) => {
    const response = await api.get("/admin/post-offices", { params: filters });
    return response.data;
  },

  // Get post office by ID
  getPostOfficeById: async (id: string) => {
    const response = await api.get(`/admin/post-offices/${id}`);
    return response.data;
  },

  // Get post office stats
  getPostOfficeStats: async (id: string): Promise<PostOfficeStats> => {
    const response = await api.get(`/admin/post-offices/${id}/stats`);
    return response.data?.data || response.data;
  },

  // Create post office
  createPostOffice: async (data: CreatePostOfficeData) => {
    const response = await api.post("/admin/post-offices", data);
    return response.data;
  },

  // Update post office
  updatePostOffice: async (id: string, data: Partial<CreatePostOfficeData>) => {
    const response = await api.patch(`/admin/post-offices/${id}`, data);
    return response.data;
  },

  // Delete post office
  deletePostOffice: async (id: string) => {
    const response = await api.delete(`/admin/post-offices/${id}`);
    return response.data;
  },

  // Get shippers of a post office
  getPostOfficeShippers: async (id: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/admin/post-offices/${id}/shippers`, { params });
    return response.data;
  },

  // Assign shipper to post office
  assignShipperToPostOffice: async (postOfficeId: string, shipperId: string) => {
    const response = await api.post(`/admin/post-offices/${postOfficeId}/shippers`, { shipper_id: shipperId });
    return response.data;
  },

  // Remove shipper from post office
  removeShipperFromPostOffice: async (postOfficeId: string, shipperId: string) => {
    const response = await api.delete(`/admin/post-offices/${postOfficeId}/shippers/${shipperId}`);
    return response.data;
  },

  // Auto-assign shipment
  autoAssignShipment: async (shipmentId: string) => {
    const response = await api.post(`/admin/post-offices/shipments/${shipmentId}/auto-assign`);
    return response.data;
  },

  // Reset daily counts
  resetDailyCounts: async () => {
    const response = await api.post("/admin/post-offices/reset-daily-counts");
    return response.data;
  },

  // Get provinces
  getProvinces: async (region?: string) => {
    const response = await api.get("/admin/post-offices/provinces", { params: { region } });
    return response.data?.data || response.data;
  },

  // Get wards by province
  getWards: async (provinceCode?: string, wardType?: 'phuong' | 'xa') => {
    const response = await api.get("/admin/post-offices/wards", { 
      params: { province_code: provinceCode, ward_type: wardType } 
    });
    return response.data?.data || response.data;
  },
};
