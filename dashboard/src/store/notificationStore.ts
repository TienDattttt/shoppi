import { create } from 'zustand';
import { notificationService } from '@/services/notification.service';

export interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    description?: string; // Alias for body
    data: Record<string, unknown> | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
    timestamp?: Date; // Computed from createdAt
    image?: string;
    link?: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    fetchNotifications: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    addNotification: (notification: Notification) => void;
}

// Parse timestamp ensuring UTC timezone is handled correctly
function parseTimestamp(timestamp: string): Date {
    if (!timestamp) return new Date();
    // If timestamp doesn't have timezone info, assume it's UTC
    const ts = timestamp.endsWith('Z') || timestamp.includes('+') || timestamp.includes('-', 10) 
        ? timestamp 
        : timestamp + 'Z';
    return new Date(ts);
}

// Transform API response to store format
function transformNotification(n: any): Notification {
    const createdAt = n.created_at || n.createdAt;
    return {
        id: n.id,
        type: n.type || 'SYSTEM',
        title: n.title,
        body: n.body,
        description: n.body, // Alias
        data: n.data,
        isRead: n.is_read || n.isRead || false,
        readAt: n.read_at || n.readAt,
        createdAt: createdAt,
        timestamp: parseTimestamp(createdAt),
        image: n.data?.image || n.image,
        link: n.data?.link || n.link || getNotificationLink(n),
    };
}

// Generate link based on notification type and data
function getNotificationLink(n: any): string | undefined {
    const type = n.type?.toLowerCase();
    const data = n.data || {};
    
    if (type?.includes('order') && data.orderId) {
        return `/user/purchase`;
    }
    if (type?.includes('promo') || type?.includes('voucher')) {
        return '/vouchers';
    }
    if (type?.includes('chat') || type?.includes('message')) {
        return '/user/chat';
    }
    return undefined;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,

    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const response = await notificationService.getNotifications({ limit: 50 });
            // API returns { data: [...], total, page, limit, hasMore }
            const rawData = response.data || response || [];
            const notifications = (Array.isArray(rawData) ? rawData : []).map(transformNotification);
            const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
            
            set({ notifications, unreadCount, loading: false });
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            set({ loading: false });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const response = await notificationService.getUnreadCount();
            set({ unreadCount: response.count || response.unreadCount || 0 });
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    },

    markAsRead: async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            set((state) => {
                const newNotifications = state.notifications.map(n =>
                    n.id === id ? { ...n, isRead: true } : n
                );
                return {
                    notifications: newNotifications,
                    unreadCount: newNotifications.filter(n => !n.isRead).length
                };
            });
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    },

    markAllAsRead: async () => {
        try {
            await notificationService.markAllAsRead();
            set((state) => ({
                notifications: state.notifications.map(n => ({ ...n, isRead: true })),
                unreadCount: 0
            }));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    },

    addNotification: (notification) => set((state) => {
        const newNotifications = [notification, ...state.notifications];
        return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.isRead).length
        };
    })
}));
