import api from "./api";

export interface Review {
    _id: string;
    productId: string;
    productName: string;
    productImage: string;
    userId: string;
    userName: string;
    userAvatar: string;
    rating: number;
    comment: string;
    reply?: string;
    status: 'visible' | 'hidden';
    createdAt: string;
}

export const reviewService = {
    getShopReviews: async (shopId: string) => {
        try {
            const response = await api.get(`/shops/${shopId}/reviews`);
            return response.data;
        } catch (error) {
            console.error("Fetch reviews error", error);
            return {
                data: [
                    {
                        _id: "r1",
                        productId: "p1",
                        productName: "Gaming Headset X",
                        productImage: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=65&h=65",
                        userId: "u1",
                        userName: "Alice Smith",
                        userAvatar: "https://github.com/shadcn.png",
                        rating: 5,
                        comment: "Great sound quality and very comfortable!",
                        status: "visible",
                        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
                    },
                    {
                        _id: "r2",
                        productId: "p2",
                        productName: "Wireless Mouse",
                        productImage: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=65&h=65",
                        userId: "u2",
                        userName: "Bob Jones",
                        userAvatar: "",
                        rating: 3,
                        comment: "Battery life could be better.",
                        reply: "Sorry to hear that, Bob. We are working on a new version.",
                        status: "visible",
                        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
                    }
                ],
                total: 2,
                average: 4.0
            };
        }
    },

    replyToReview: async (id: string, content: string) => {
        return api.post(`/reviews/${id}/reply`, { content });
    },

    hideReview: async (id: string) => {
        return api.patch(`/reviews/${id}/hide`);
    },

    showReview: async (id: string) => {
        return api.patch(`/reviews/${id}/show`);
    }
};
