import { create } from 'zustand';
import { notificationService, type Notification } from '@/services/notification.service';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,

    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const data = await notificationService.getNotifications();
            set({
                notifications: data,
                unreadCount: data.filter(n => !n.isRead).length,
                loading: false
            });
        } catch (error) {
            console.error("Failed to fetch notifications", error);
            set({ loading: false });
        }
    },

    markAsRead: async (id: string) => {
        // Optimistic update
        const { notifications, unreadCount } = get();
        const updated = notifications.map(n =>
            n._id === id ? { ...n, isRead: true } : n
        );

        // Only decrease count if it was unread
        const wasUnread = notifications.find(n => n._id === id)?.isRead === false;

        set({
            notifications: updated,
            unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount
        });

        await notificationService.markAsRead(id);
    },

    markAllAsRead: async () => {
        // Optimistic update
        const { notifications } = get();
        const updated = notifications.map(n => ({ ...n, isRead: true }));

        set({
            notifications: updated,
            unreadCount: 0
        });

        await notificationService.markAllAsRead();
    }
}));
