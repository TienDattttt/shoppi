import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string;
    productId: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    variant?: string;
    quantity: number;
    shopId: string;
    shopName: string;
    selected: boolean;
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
    voucherCode: string | null;
    discountAmount: number;

    addToCart: (item: Omit<CartItem, 'selected'>) => void;
    removeFromCart: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    toggleSelection: (id: string) => void;
    toggleAllSelection: (selected: boolean) => void;
    toggleShopSelection: (shopId: string, selected: boolean) => void;
    applyVoucher: (code: string) => Promise<boolean>;
    removeVoucher: () => void;

    // Getters
    selectedItemsCount: () => number;
    subtotal: () => number;
    total: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            voucherCode: null,
            discountAmount: 0,

            addToCart: (newItem) => set((state) => {
                const existingItemIndex = state.items.findIndex(
                    item => item.productId === newItem.productId && item.variant === newItem.variant
                );

                if (existingItemIndex > -1) {
                    const newItems = [...state.items];
                    newItems[existingItemIndex].quantity += newItem.quantity;
                    return { items: newItems };
                }

                return { items: [...state.items, { ...newItem, selected: true }] };
            }),

            removeFromCart: (id) => set((state) => ({
                items: state.items.filter(item => item.id !== id)
            })),

            updateQuantity: (id, quantity) => set((state) => ({
                items: state.items.map(item =>
                    item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
                )
            })),

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
                // Mock voucher API call
                if (code === "WELCOME20") {
                    set({ voucherCode: code, discountAmount: 20000 });
                    return true;
                }
                return false;
            },

            removeVoucher: () => set({ voucherCode: null, discountAmount: 0 }),

            selectedItemsCount: () => get().items.filter(i => i.selected).length,

            subtotal: () => get().items
                .filter(i => i.selected)
                .reduce((sum, item) => sum + (item.price * item.quantity), 0),

            total: () => {
                const sub = get().subtotal();
                return Math.max(0, sub - get().discountAmount);
            }
        }),
        {
            name: 'cart-storage',
        }
    )
);
