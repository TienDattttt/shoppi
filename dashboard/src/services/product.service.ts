import api from "./api";

export interface Product {
    _id: string;
    product_name: string;
    product_thumb: string;
    product_description?: string;
    product_price: number;
    product_quantity: number;
    product_type: "Electronic" | "Clothing" | "Furniture" | "Other";
    product_attributes?: any;
    product_ratingsAverage?: number;
    isDraft?: boolean;
    isPublished?: boolean;
    shopId?: string;
    shopName?: string;
    createdAt?: string;
}

export const productService = {
    getAllDraftsForShop: async () => {
        try {
            const response = await api.get("/products/drafts/all");
            return response.data;
        } catch (error) {
            console.error("Fetch drafts error", error);
            return {
                data: [
                    { _id: "p1", product_name: "Áo Polo Nam Premium", product_thumb: "https://placehold.co/100", product_price: 250000, product_quantity: 100, product_type: "Clothing", isDraft: true, createdAt: "2023-10-20" },
                    { _id: "p3", product_name: "Ghế Sofa Mini", product_thumb: "https://placehold.co/100", product_price: 1200000, product_quantity: 20, product_type: "Furniture", isDraft: true, createdAt: "2023-10-21" },
                ],
                total: 2
            };
        }
    },

    getAllPublishedForShop: async () => {
        try {
            const response = await api.get("/products/published/all");
            return response.data;
        } catch (error) {
            console.error("Fetch published error", error);
            return {
                data: [
                    { _id: "p2", product_name: "iPhone 15 Pro Max", product_thumb: "https://placehold.co/100", product_price: 32000000, product_quantity: 5, product_type: "Electronic", isPublished: true, product_ratingsAverage: 4.8, createdAt: "2023-09-15" }
                ],
                total: 1
            };
        }
    },

    getPendingProducts: async () => {
        try {
            const response = await api.get("/admin/products/pending");
            return response.data;
        } catch (error) {
            console.error("Fetch pending error", error);
            return {
                data: [
                    { _id: "p_pend_1", product_name: "Tai nghe Sony WH-1000XM5", product_thumb: "https://placehold.co/100", product_price: 6990000, product_quantity: 50, product_type: "Electronic", shopName: "Tech Store", createdAt: "10 mins ago" },
                    { _id: "p_pend_2", product_name: "Áo Tshirt Basic", product_thumb: "https://placehold.co/100", product_price: 150000, product_quantity: 200, product_type: "Clothing", shopName: "Fashion Hub", createdAt: "1 hour ago" },
                    { _id: "p_pend_3", product_name: "Bàn phím cơ Keychron K2", product_thumb: "https://placehold.co/100", product_price: 1800000, product_quantity: 15, product_type: "Electronic", shopName: "Gear Shop", createdAt: "2 hours ago" },
                ],
                total: 3
            };
        }
    },

    createProduct: async (data: any) => {
        return api.post("/products", data);
    },

    publishProduct: async (id: string) => {
        return api.post(`/products/publish/${id}`);
    },

    unpublishProduct: async (id: string) => {
        return api.post(`/products/unpublish/${id}`);
    },

    getProductById: async (id: string) => {
        try {
            // In real app, fetch from API
            const response = await api.get(`/products/${id}`);
            return response.data;
        } catch (error) {
            // Mock
            return {
                _id: id,
                product_name: "Mock Product Edit",
                product_thumb: "https://placehold.co/100",
                product_description: "This is a mock description for editing.",
                product_price: 500000,
                product_quantity: 100,
                product_type: "Electronic",
                isPublished: true,
                product_attributes: {
                    brand: "MockBrand",
                    model: "M1"
                }
            };
        }
    },

    updateProduct: async (id: string, data: any) => {
        return api.put(`/products/${id}`, data);
    },

    approveProduct: async (id: string) => {
        return api.post(`/admin/products/${id}/approve`);
    },

    rejectProduct: async (id: string, reason: string) => {
        return api.post(`/admin/products/${id}/reject`, { reason });
    }
};
