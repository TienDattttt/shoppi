import api from "./api";

export interface Review {
    id: string;
    product_id: string;
    user_id: string;
    order_item_id: string;
    rating: number;
    content: string | null;
    images: string[];
    is_anonymous: boolean;
    reply: string | null;
    replied_at: string | null;
    replied_by: string | null;
    is_visible: boolean;
    created_at: string;
    updated_at: string;
    // Relations
    user?: { id: string; full_name: string; avatar_url: string | null };
    product?: { id: string; name: string; slug: string };
}

export interface CreateReviewData {
    productId: string;
    orderItemId: string;
    rating: number;
    content?: string;
    images?: string[];
    isAnonymous?: boolean;
}

export interface ReviewFilters {
    productId?: string;
    shopId?: string;
    rating?: number;
    hasReply?: boolean;
    page?: number;
    limit?: number;
}

export const reviewService = {
    // ============================================
    // CUSTOMER OPERATIONS
    // ============================================

    // Create review
    createReview: async (data: CreateReviewData) => {
        const response = await api.post(`/products/${data.productId}/reviews`, data);
        return response.data;
    },

    // Get my reviews
    getMyReviews: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get("/users/me/reviews", { params });
        return response.data;
    },

    // Update review
    updateReview: async (id: string, data: { rating?: number; content?: string; images?: string[] }) => {
        const response = await api.put(`/reviews/${id}`, data);
        return response.data;
    },

    // Delete review
    deleteReview: async (id: string) => {
        const response = await api.delete(`/reviews/${id}`);
        return response.data;
    },

    // ============================================
    // PUBLIC OPERATIONS
    // ============================================

    // Get product reviews
    getProductReviews: async (productId: string, params?: { rating?: number; page?: number; limit?: number }) => {
        const response = await api.get(`/products/${productId}/reviews`, { params });
        return response.data;
    },

    // Get review statistics for product
    getProductReviewStats: async (productId: string) => {
        const response = await api.get(`/products/${productId}/reviews/stats`);
        return response.data;
    },

    // ============================================
    // PARTNER OPERATIONS
    // ============================================

    // Get shop reviews
    getShopReviews: async (params?: ReviewFilters) => {
        const response = await api.get("/shop/reviews", { params });
        return response.data;
    },

    // Reply to review
    replyToReview: async (productId: string, reviewId: string, content: string) => {
        const response = await api.post(`/products/${productId}/reviews/${reviewId}/reply`, { content });
        return response.data;
    },

    // Update reply
    updateReply: async (reviewId: string, content: string) => {
        const response = await api.put(`/reviews/${reviewId}/reply`, { content });
        return response.data;
    },

    // Delete reply
    deleteReply: async (reviewId: string) => {
        const response = await api.delete(`/reviews/${reviewId}/reply`);
        return response.data;
    },

    // ============================================
    // ADMIN OPERATIONS
    // ============================================

    // Get all reviews (Admin)
    getAllReviews: async (params?: ReviewFilters) => {
        const response = await api.get("/admin/reviews", { params });
        return response.data;
    },

    // Hide review (Admin)
    hideReview: async (id: string, reason: string) => {
        const response = await api.patch(`/admin/reviews/${id}/hide`, { reason });
        return response.data;
    },

    // Show review (Admin)
    showReview: async (id: string) => {
        const response = await api.patch(`/admin/reviews/${id}/show`);
        return response.data;
    },

    // ============================================
    // IMAGE UPLOAD
    // ============================================

    // Upload review images
    uploadImages: async (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));
        
        const response = await api.post("/reviews/upload", formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};
