
export interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    createdAt: string;
    link?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        _id: "n1",
        title: "New Order Received",
        message: "You have received a new order #ORD-001 from John Doe.",
        type: "success",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
        link: "/partner/orders/o1"
    },
    {
        _id: "n2",
        title: "Low Stock Alert",
        message: "Product 'Gaming Headset' is running low on stock (5 items left).",
        type: "warning",
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        link: "/partner/products/p2"
    },
    {
        _id: "n3",
        title: "System Update",
        message: "The system will be under maintenance tonight at 2 AM.",
        type: "info",
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
    {
        _id: "n4",
        title: "Payment Failed",
        message: "Payment for order #ORD-999 failed.",
        type: "error",
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    }
];

export const notificationService = {
    getNotifications: async () => {
        // Simulate API delay
        return new Promise<Notification[]>((resolve) => {
            setTimeout(() => {
                resolve([...MOCK_NOTIFICATIONS]);
            }, 500);
        });
    },

    markAsRead: async (id: string) => {
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                console.log(`Notification ${id} marked as read`);
                resolve();
            }, 200);
        });
    },

    markAllAsRead: async () => {
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                console.log("All notifications marked as read");
                resolve();
            }, 500);
        });
    }
};
