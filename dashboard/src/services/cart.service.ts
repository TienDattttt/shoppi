import api from "./api";

export interface CartItem {
    id: string;
    cartId: string;
    productId: string;
    variantId: string;
    quantity: number;
    isSelected: boolean;
    isAvailable: boolean;
    product: {
        id: string;
        name: string;
        slug: string;
        shopId: string;
        thumbnailUrl: string | null;
    };
    variant: {
        id: string;
        name: string | null;
        sku: string | null;
        price: number;
        compareAtPrice: number | null;
        stockQuantity: number;
        imageUrl: string | null;
        attributes?: Record<string, string>;
    };
    // Computed
    unitPrice: number;
    totalPrice: number;
}

export interface CartShopGroup {
    shopId: string;
    shopName?: string;
    items: CartItem[];
    subtotal: number;
}

export interface Cart {
    id: string;
    userId: string;
    itemsByShop: CartShopGroup[];
    totalItems: number;
    totalQuantity: number;
}

export interface AddToCartData {
    productId: string;
    variantId: string;
    quantity: number;
}

export const cartService = {
    // Get user's cart
    getCart: async (): Promise<Cart> => {
        const response = await api.get("/cart");
        return response.data;
    },

    // Add item to cart
    addItem: async (data: AddToCartData): Promise<CartItem> => {
        const response = await api.post("/cart/items", data);
        return response.data;
    },

    // Update cart item quantity
    updateItem: async (itemId: string, quantity: number): Promise<CartItem> => {
        const response = await api.put(`/cart/items/${itemId}`, { quantity });
        return response.data;
    },

    // Remove item from cart
    removeItem: async (itemId: string): Promise<void> => {
        await api.delete(`/cart/items/${itemId}`);
    },

    // Clear cart
    clearCart: async (): Promise<void> => {
        await api.delete("/cart");
    },

    // Validate cart items availability
    validateCart: async (): Promise<{ isValid: boolean; unavailableItems: any[] }> => {
        const response = await api.get("/cart/validate");
        return response.data;
    },
};
