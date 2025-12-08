import api from "./api";

export interface Category {
    id: string;
    _id?: string; // alias for compatibility
    name: string;
    slug: string;
    parent_id?: string | null;
    description?: string;
    image_url?: string;
    sort_order: number;
    is_active: boolean;
    level?: number;
    path?: string;
    children?: Category[];
}

// Build tree structure from flat list
function buildCategoryTree(categories: any[]): any[] {
    const map = new Map();
    const roots: any[] = [];

    // First pass: create map
    categories.forEach(cat => {
        map.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    categories.forEach(cat => {
        const node = map.get(cat.id);
        if (cat.parent_id && map.has(cat.parent_id)) {
            map.get(cat.parent_id).children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

export const categoryService = {
    getAllCategories: async () => {
        const response = await api.get("/admin/categories");
        const flatCategories = response.data.categories || response.data;
        return buildCategoryTree(flatCategories);
    },

    // Get flat list (for parent selection dropdown)
    getFlatCategories: async () => {
        const response = await api.get("/admin/categories");
        return response.data.categories || response.data;
    },

    getCategoryById: async (id: string) => {
        const response = await api.get(`/admin/categories/${id}`);
        return response.data.category || response.data;
    },

    createCategory: async (data: Partial<Category>) => {
        const response = await api.post("/admin/categories", data);
        return response.data;
    },

    updateCategory: async (id: string, data: Partial<Category>) => {
        const response = await api.patch(`/admin/categories/${id}`, data);
        return response.data;
    },

    deleteCategory: async (id: string) => {
        const response = await api.delete(`/admin/categories/${id}`);
        return response.data;
    }
};
