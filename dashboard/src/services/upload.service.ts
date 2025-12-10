import api from "./api";

export const uploadService = {
    /**
     * Upload product images
     * @param files - Array of File objects
     * @returns Array of uploaded image URLs
     */
    uploadProductImages: async (files: File[]): Promise<string[]> => {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));
        
        const response = await api.post('/products/upload/images', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        return response.data?.data || [];
    },
};
