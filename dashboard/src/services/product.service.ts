import api from "./api";

export interface Product {
    id: string;
    _id?: string; // Alias for compatibility
    shop_id: string;
    category_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    short_description: string | null;
    base_price: number;
    compare_at_price: number | null;
    currency: string;
    status: 'pending' | 'active' | 'rejected' | 'revision_required' | 'deleted';
    meta_title: string | null;
    meta_description: string | null;
    view_count: number;
    created_at: string;
    updated_at: string;
    // Compatibility fields (transformed by backend or frontend)
    product_name?: string;
    product_thumb?: string;
    product_price?: number;
    product_type?: string;
    product_quantity?: number;
    shopName?: string;
    createdAt?: string;
    isDraft?: boolean;
    isPublished?: boolean;
    // Relations
    variants?: ProductVariant[];
    images?: ProductImage[];
    category?: Category;
    shop?: { id: string; shop_name: string };
}

export interface ProductVariant {
    id: string;
    product_id: string;
    sku: string | null;
    name: string | null;
    attributes: Record<string, any>;
    price: number | null;
    compare_at_price: number | null;
    quantity: number;
    low_stock_threshold: number;
    image_url: string | null;
    is_active: boolean;
}

export interface ProductImage {
    id: string;
    product_id: string;
    url: string;
    alt_text: string | null;
    sort_order: number;
    is_primary: boolean;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parent_id: string | null;
    image_url: string | null;
    is_active: boolean;
}

export interface CreateProductData {
    // Backend field names
    name?: string;
    description?: string;
    short_description?: string;
    category_id?: string | null;
    base_price?: number;
    compare_at_price?: number | null;
    currency?: string;
    meta_title?: string;
    meta_description?: string;
    quantity?: number; // For default variant
    // Frontend field names (backend accepts both)
    product_name?: string;
    product_description?: string;
    product_price?: number;
    product_quantity?: number;
    product_type?: string;
    product_attributes?: Record<string, unknown>;
    product_images?: string | string[];
}

export interface ProductFilters {
    q?: string;
    categoryId?: string;
    shopId?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const productService = {
    // ============================================
    // PRODUCT OPERATIONS
    // ============================================

    // Search/list products (public)
    searchProducts: async (filters: ProductFilters = {}) => {
        const response = await api.get("/products", { params: filters });
        return response.data;
    },

    // Get my shop's products (Partner) - uses searchProducts with shop filter
    getMyShopProducts: async (filters: ProductFilters = {}) => {
        // First get the partner's shop
        const shopResponse = await api.get("/shops/me");
        const shop = shopResponse.data?.shop || shopResponse.data;
        if (!shop?.id) {
            throw new Error("Shop not found");
        }
        // Then get products for that shop
        const response = await api.get("/products", { 
            params: { ...filters, shopId: shop.id } 
        });
        return response.data;
    },

    // Get published products for partner's shop
    getAllPublishedForShop: async () => {
        const shopResponse = await api.get("/shops/me");
        const shop = shopResponse.data?.shop || shopResponse.data;
        if (!shop?.id) {
            throw new Error("Shop not found");
        }
        const response = await api.get("/products", { 
            params: { shopId: shop.id, status: 'active' } 
        });
        return response.data;
    },

    // Get draft products for partner's shop
    getAllDraftsForShop: async () => {
        const shopResponse = await api.get("/shops/me");
        const shop = shopResponse.data?.shop || shopResponse.data;
        if (!shop?.id) {
            throw new Error("Shop not found");
        }
        const response = await api.get("/products", { 
            params: { shopId: shop.id, status: 'pending' } 
        });
        return response.data;
    },

    // Get product by ID
    getProductById: async (id: string) => {
        const response = await api.get(`/products/${id}`);
        return response.data;
    },

    // Create product (Partner)
    createProduct: async (data: CreateProductData) => {
        const response = await api.post("/products", data);
        return response.data;
    },

    // Update product (Partner)
    updateProduct: async (id: string, data: Partial<CreateProductData>) => {
        const response = await api.put(`/products/${id}`, data);
        return response.data;
    },

    // Delete product (Partner)
    deleteProduct: async (id: string) => {
        const response = await api.delete(`/products/${id}`);
        return response.data;
    },

    // ============================================
    // VARIANT OPERATIONS
    // ============================================

    // Add variant
    addVariant: async (productId: string, data: Partial<ProductVariant>) => {
        const response = await api.post(`/products/${productId}/variants`, data);
        return response.data;
    },

    // Update variant
    updateVariant: async (productId: string, variantId: string, data: Partial<ProductVariant>) => {
        const response = await api.put(`/products/${productId}/variants/${variantId}`, data);
        return response.data;
    },

    // Delete variant
    deleteVariant: async (productId: string, variantId: string) => {
        const response = await api.delete(`/products/${productId}/variants/${variantId}`);
        return response.data;
    },

    // Update inventory
    updateInventory: async (productId: string, variantId: string, quantity: number) => {
        const response = await api.put(`/products/${productId}/inventory`, { variantId, quantity });
        return response.data;
    },

    // ============================================
    // IMAGE OPERATIONS
    // ============================================

    // Upload images
    uploadImages: async (productId: string, files: File[]) => {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));
        
        const response = await api.post(`/products/${productId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Delete image
    deleteImage: async (productId: string, imageId: string) => {
        const response = await api.delete(`/products/${productId}/images/${imageId}`);
        return response.data;
    },

    // ============================================
    // REVIEW OPERATIONS
    // ============================================

    // Get product reviews
    getReviews: async (productId: string, params?: { page?: number; limit?: number }) => {
        const response = await api.get(`/products/${productId}/reviews`, { params });
        return response.data;
    },

    // Create review (Customer)
    createReview: async (productId: string, data: { rating: number; content: string; images?: string[] }) => {
        const response = await api.post(`/products/${productId}/reviews`, data);
        return response.data;
    },

    // Reply to review (Partner)
    replyToReview: async (productId: string, reviewId: string, content: string) => {
        const response = await api.post(`/products/${productId}/reviews/${reviewId}/reply`, { content });
        return response.data;
    },

    // ============================================
    // ADMIN OPERATIONS
    // ============================================

    // Get pending products for approval
    getPendingProducts: async () => {
        const response = await api.get("/admin/products/pending");
        return response.data;
    },

    // Approve product
    approveProduct: async (id: string) => {
        const response = await api.post(`/admin/products/${id}/approve`);
        return response.data;
    },

    // Reject product
    rejectProduct: async (id: string, reason: string) => {
        const response = await api.post(`/admin/products/${id}/reject`, { reason });
        return response.data;
    },

    // Request revision
    requestRevision: async (id: string, changes: string) => {
        const response = await api.post(`/admin/products/${id}/revision`, { changes });
        return response.data;
    },

    // ============================================
    // CATEGORY OPERATIONS
    // ============================================

    // Get all categories
    getCategories: async () => {
        const response = await api.get("/categories");
        return response.data;
    },

    // Get category by ID
    getCategoryById: async (id: string) => {
        const response = await api.get(`/categories/${id}`);
        return response.data;
    },

    // Create category (Admin)
    createCategory: async (data: { name: string; description?: string; parent_id?: string; image_url?: string }) => {
        const response = await api.post("/categories", data);
        return response.data;
    },

    // Update category (Admin)
    updateCategory: async (id: string, data: Partial<Category>) => {
        const response = await api.put(`/categories/${id}`, data);
        return response.data;
    },

    // Delete category (Admin)
    deleteCategory: async (id: string) => {
        const response = await api.delete(`/categories/${id}`);
        return response.data;
    },

    // ============================================
    // WISHLIST OPERATIONS
    // ============================================

    // Get wishlist
    getWishlist: async () => {
        const response = await api.get("/wishlist");
        return response.data;
    },

    // Add to wishlist
    addToWishlist: async (productId: string) => {
        const response = await api.post(`/wishlist/${productId}`);
        return response.data;
    },

    // Remove from wishlist
    removeFromWishlist: async (productId: string) => {
        const response = await api.delete(`/wishlist/${productId}`);
        return response.data;
    },
};
