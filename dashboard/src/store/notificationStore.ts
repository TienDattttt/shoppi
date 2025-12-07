import { create } from 'zustand';

export interface Notification {
    id: string;
    type: 'ORDER' | 'PROMOTION' | 'WALLET' | 'SYSTEM';
    title: string;
    description: string;
    timestamp: Date;
    isRead: boolean;
    image?: string;
    link?: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    addNotification: (notification: Notification) => void;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: 'n1',
        type: 'ORDER',
        title: 'Order Completed',
        description: 'Order #ORD-001 has been delivered successfully. Please rate the product.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        isRead: false,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=60',
        link: '/user/purchase/order/ORD-001'
    },
    {
        id: 'n2',
        type: 'PROMOTION',
        title: 'Super Sale 12.12',
        description: 'Get up to 50% off on all Fashion items today!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        isRead: false,
        image: 'https://via.placeholder.com/100x100.png?text=Sale',
        link: '/'
    },
    {
        id: 'n3',
        type: 'WALLET',
        title: 'Refund Processed',
        description: 'Refund for order #ORD-000 has been initiated to your wallet.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        isRead: true,
        link: '/user/wallet'
    }
];

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: MOCK_NOTIFICATIONS,
    unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.isRead).length,

    markAsRead: (id) => set((state) => {
        const newNotifications = state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        );
        return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.isRead).length
        };
    }),

    markAllAsRead: () => set((state) => {
        const newNotifications = state.notifications.map(n => ({ ...n, isRead: true }));
        return {
            notifications: newNotifications,
            unreadCount: 0
        };
    }),

    addNotification: (notification) => set((state) => {
        const newNotifications = [notification, ...state.notifications];
        return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.isRead).length
        };
    })
}));
