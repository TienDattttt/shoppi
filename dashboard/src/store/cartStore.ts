import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartService } from '@/services/cart.service';
import type { CartItem as ApiCartItem } from '@/services/cart.service';

export interface CartItem {
    id: string;
    productId: string;
    variantId: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    variant?: string;
    quantity: number;
    shopId: string;
    shopName: string;
    selected: boolean;
    stock: number;
}

export interface Voucher {
    id: string;
    code: string;
    type: 'fixed' | 'percent' | 'shipping';
    value: number;
    minSpend: number;
    expiryDate: Date;
    isExpired: boolean;
}

interface CartState {
    items: CartItem[];
    loading: boolean;
    error: string | null;
    voucherCode: string | null;
    discountAmount: number;
    lastFetched: number | null;

    // API actions
    fetchCart: () => Promise<void>;
    addToCart: (item: { productId: string; variantId: string; quantity: number; name: string; price: number; originalPrice?: number; image: string; variant?: string; shopId: string; shopName: string; stock: number }) => Promise<void>;
    removeFromCart: (id: string) => Promise<void>;
    updateQuantity: (id: string, quantity: number) => Promise<void>;
    
    // Local actions
    toggleSelection: (id: string) => void;
    toggleAllSelection: (selected: boolean) => void;
    toggleShopSelection: (shopId: string, selected: boolean) => void;
    applyVoucher: (code: string) => Promise<boolean>;
    removeVoucher: () => void;
    clearLocalCart: () => void;

    // Getters
    selectedItemsCount: () => number;
    subtotal: () => number;
    total: () => number;
    getSelectedItems: () => CartItem[];
}

// Transform API cart item to local cart item
function transformCartItem(item: ApiCartItem, shopName?: string): CartItem {
    const price = item.variant?.price || 0;
    const compareAtPrice = (item.variant as any)?.compareAtPrice;
    
    return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        name: item.product?.name || 'Unknown Product',
        price: price,
        originalPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : undefined,
        image: item.variant?.imageUrl || item.product?.thumbnailUrl || 'https://placehold.co/100x100?text=Product',
        variant: item.variant?.name || formatVariantAttributes((item.variant as any)?.attributes),
        quantity: item.quantity,
        shopId: item.product?.shopId || 'unknown',
        shopName: shopName || 'Shop',
        selected: item.isSelected !== false,
        stock: item.variant?.stockQuantity || 0,
    };
}

// Format variant attributes to display string
function formatVariantAttributes(attributes: Record<string, any> | undefined): string | undefined {
    if (!attributes || Object.keys(attributes).length === 0) return undefined;
    return Object.entries(attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            loading: false,
            error: null,
            voucherCode: null,
            discountAmount: 0,
            lastFetched: null,

            fetchCart: async () => {
                try {
                    set({ loading: true, error: null });
                    const cart = await cartService.getCart();
                    
                    // Transform API response to local format
                    const items: CartItem[] = [];
                    for (const shopGroup of cart.itemsByShop || []) {
                        for (const item of shopGroup.items || []) {
                            items.push(transformCartItem(item, shopGroup.shopName));
                        }
                    }
                    
                    set({ items, loading: false, lastFetched: Date.now() });
                } catch (error: any) {
                    console.error('Error fetching cart:', error);
                    set({ loading: false, error: error.message });
                }
            },

            addToCart: async (newItem) => {
                try {
                    set({ loading: true, error: null });
                    
                    // Call API
                    await cartService.addItem({
                        productId: newItem.productId,
                        variantId: newItem.variantId,
                        quantity: newItem.quantity,
                    });
                    
                    // Optimistic update - add to local state
                    set((state) => {
                        const existingItemIndex = state.items.findIndex(
                            item => item.variantId === newItem.variantId
                        );

                        if (existingItemIndex > -1) {
                            const newItems = [...state.items];
                            newItems[existingItemIndex].quantity += newItem.quantity;
                            return { items: newItems, loading: false };
                        }

                        const cartItem: CartItem = {
                            id: `temp-${Date.now()}`, // Temporary ID until refresh
                            productId: newItem.productId,
                            variantId: newItem.variantId,
                            name: newItem.name,
                            price: newItem.price,
                            originalPrice: newItem.originalPrice,
                            image: newItem.image,
                            variant: newItem.variant,
                            quantity: newItem.quantity,
                            shopId: newItem.shopId,
                            shopName: newItem.shopName,
                            selected: true,
                            stock: newItem.stock,
                        };

                        return { items: [...state.items, cartItem], loading: false };
                    });
                    
                    // Refresh cart to get real IDs
                    await get().fetchCart();
                } catch (error: any) {
                    console.error('Error adding to cart:', error);
                    set({ loading: false, error: error.message });
                    throw error;
                }
            },

            removeFromCart: async (id) => {
                try {
                    // Optimistic update
                    set((state) => ({
                        items: state.items.filter(item => item.id !== id)
                    }));
                    
                    // Call API
                    await cartService.removeItem(id);
                } catch (error: any) {
                    console.error('Error removing from cart:', error);
                    // Revert on error - refetch cart
                    await get().fetchCart();
                    throw error;
                }
            },

            updateQuantity: async (id, quantity) => {
                const prevItems = get().items;
                
                try {
                    // Optimistic update
                    set((state) => ({
                        items: state.items.map(item =>
                            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
                        )
                    }));
                    
                    // Call API
                    await cartService.updateItem(id, quantity);
                } catch (error: any) {
                    console.error('Error updating quantity:', error);
                    // Revert on error
                    set({ items: prevItems });
                    throw error;
                }
            },

            toggleSelection: (id) => set((state) => ({
                items: state.items.map(item =>
                    item.id === id ? { ...item, selected: !item.selected } : item
                )
            })),

            toggleAllSelection: (selected) => set((state) => ({
                items: state.items.map(item => ({ ...item, selected }))
            })),

            toggleShopSelection: (shopId, selected) => set((state) => ({
                items: state.items.map(item =>
                    item.shopId === shopId ? { ...item, selected } : item
                )
            })),

            applyVoucher: async (code) => {
                // TODO: Implement voucher API
                if (code === "WELCOME20") {
                    set({ voucherCode: code, discountAmount: 20000 });
                    return true;
                }
                return false;
            },

            removeVoucher: () => set({ voucherCode: null, discountAmount: 0 }),

            clearLocalCart: () => set({ items: [], voucherCode: null, discountAmount: 0 }),

            selectedItemsCount: () => get().items.filter(i => i.selected).length,

            subtotal: () => get().items
                .filter(i => i.selected)
                .reduce((sum, item) => sum + (item.price * item.quantity), 0),

            total: () => {
                const sub = get().subtotal();
                return Math.max(0, sub - get().discountAmount);
            },

            getSelectedItems: () => get().items.filter(i => i.selected),
        }),
        {
            name: 'cart-storage',
            partialize: (state) => ({
                items: state.items,
                voucherCode: state.voucherCode,
                discountAmount: state.discountAmount,
            }),
        }
    )
);
