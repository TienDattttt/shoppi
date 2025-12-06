import api from "./api";

export interface Category {
    _id: string;
    name: string;
    slug: string;
    parentId?: string;
    parentName?: string;
    image?: string;
    displayOrder: number;
    status: 'active' | 'inactive';
    children?: Category[];
}

export const categoryService = {
    getAllCategories: async () => {
        try {
            const response = await api.get("/categories");
            return response.data;
        } catch (error) {
            console.error("Fetch categories error", error);
            return [
                {
                    _id: "c1", name: "Electronics", slug: "electronics", displayOrder: 1, status: "active",
                    children: [
                        { _id: "c1-1", name: "Mobile Phones", slug: "mobile-phones", parentId: "c1", displayOrder: 1, status: "active" },
                        { _id: "c1-2", name: "Laptops", slug: "laptops", parentId: "c1", displayOrder: 2, status: "active" }
                    ]
                },
                {
                    _id: "c2", name: "Fashion", slug: "fashion", displayOrder: 2, status: "active",
                    children: [
                        { _id: "c2-1", name: "Men's Clothing", slug: "mens-clothing", parentId: "c2", displayOrder: 1, status: "active" },
                        { _id: "c2-2", name: "Women's Clothing", slug: "womens-clothing", parentId: "c2", displayOrder: 2, status: "active" }
                    ]
                },
                { _id: "c3", name: "Home & Living", slug: "home-living", displayOrder: 3, status: "active", children: [] }
            ] as Category[];
        }
    },

    getCategoryById: async (id: string) => {
        try {
            const response = await api.get(`/categories/${id}`);
            return response.data;
        } catch (error) {
            // Mock
            return { _id: id, name: "Mock Category", slug: "mock-category", displayOrder: 1, status: "active" };
        }
    },

    createCategory: async (data: Partial<Category>) => {
        return api.post("/categories", data);
    },

    updateCategory: async (id: string, data: Partial<Category>) => {
        return api.put(`/categories/${id}`, data);
    },

    deleteCategory: async (id: string) => {
        return api.delete(`/categories/${id}`);
    }
};
