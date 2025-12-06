import api from "./api";

export interface Order {
    _id: string;
    order_userId: string;
    userName?: string;
    order_checkout: {
        totalPrice: number;
    };
    order_shipping: {
        street: string;
        city: string;
        state: string;
        country: string;
    };
    order_payment: "COD" | "Credit Card";
    order_products: any[];
    order_status: "pending" | "confirmed" | "shipped" | "cancelled" | "delivered";
    createdAt: string;
    shopId?: string;
    shopName?: string;
}

export const orderService = {
    getAllOrders: async (params?: { page?: number; limit?: number; status?: string }) => {
        try {
            const response = await api.get("/orders", { params });
            return response.data;
        } catch (error) {
            console.error("Fetch all orders error", error);
            return {
                data: [
                    { _id: "ORD-001", order_userId: "u1", userName: "Nguyen Van A", order_checkout: { totalPrice: 1500000 }, order_status: "pending", createdAt: "2023-11-01", order_payment: "COD", order_products: [{}, {}], shopName: "Tech Store" },
                    { _id: "ORD-002", order_userId: "u2", userName: "Tran Thi B", order_checkout: { totalPrice: 250000 }, order_status: "shipped", createdAt: "2023-10-28", order_payment: "Credit Card", order_products: [{}], shopName: "Fashion Boutique" },
                    { _id: "ORD-003", order_userId: "u3", userName: "Le Van C", order_checkout: { totalPrice: 500000 }, order_status: "delivered", createdAt: "2023-10-25", order_payment: "COD", order_products: [{}], shopName: "Tech Store" },
                ] as Order[],
                total: 3
            };
        }
    },

    getShopOrders: async (params?: { page?: number; limit?: number; status?: string }) => {
        try {
            const response = await api.get("/shop/orders", { params });
            return response.data;
        } catch (error) {
            console.error("Fetch shop orders error", error);
            return {
                data: [
                    { _id: "ORD-001", order_userId: "u1", userName: "Nguyen Van A", order_checkout: { totalPrice: 1500000 }, order_status: "pending", createdAt: "2023-11-01", order_payment: "COD", order_products: [{}, {}] },
                    { _id: "ORD-003", order_userId: "u3", userName: "Le Van C", order_checkout: { totalPrice: 500000 }, order_status: "delivered", createdAt: "2023-10-25", order_payment: "COD", order_products: [{}] },
                ] as Order[],
                total: 2
            };
        }
    },

    updateOrderStatus: async (id: string, status: string) => {
        return new Promise(resolve => setTimeout(resolve, 500));
    },

    getOrderById: async (id: string) => {
        try {
            const response = await api.get(`/orders/${id}`);
            return response.data;
        } catch (error) {
            console.error("Fetch order detail error", error);
            return {
                _id: id,
                order_userId: "u001",
                userName: "Nguyen Van Customer",
                userPhone: "0912345678",
                shopId: "s001",
                shopName: "Tech Store Official",
                createdAt: "2023-11-20 14:30",
                order_status: "pending",
                order_payment: "COD",
                order_shipping: {
                    street: "123 Main St",
                    city: "Ho Chi Minh City",
                    state: "District 1",
                    country: "Vietnam",
                    shipping_fee: 30000
                },
                order_checkout: {
                    totalPrice: 1250000
                },
                order_products: [
                    {
                        productId: "p001",
                        product_name: "Wireless Headphones",
                        product_thumb: "https://placehold.co/100",
                        product_price: 1200000,
                        product_quantity: 1
                    }
                ],
                timeline: [
                    { status: "placed", time: "2023-11-20 14:30" },
                    { status: "confirmed", time: "2023-11-20 14:35" }
                ]
            };
        }
    }
};
