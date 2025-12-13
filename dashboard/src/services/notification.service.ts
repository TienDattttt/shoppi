import api from "./api";

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, any> | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
}

export interface NotificationPreference {
    id: string;
    user_id: string;
    channel: 'push' | 'email' | 'sms' | 'in_app';
    notification_type: string;
    is_enabled: boolean;
}

export interface DeviceToken {
    id: string;
    user_id: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    device_name: string | null;
    is_active: boolean;
}

export const notificationService = {
    // ============================================
    // NOTIFICATION OPERATIONS
    // ============================================

    // Get notifications
    getNotifications: async (params?: { page?: number; limit?: number; isRead?: boolean }) => {
        const response = await api.get("/notifications", { params });
        return response.data;
    },

    // Get unread count
    getUnreadCount: async () => {
        const response = await api.get("/notifications/unread-count");
        return response.data;
    },

    // Mark as read
    markAsRead: async (id: string) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    // Mark all as read
    markAllAsRead: async () => {
        const response = await api.put("/notifications/read-all");
        return response.data;
    },

    // Delete notification
    deleteNotification: async (id: string) => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    },

    // ============================================
    // PREFERENCE OPERATIONS
    // ============================================

    // Get preferences
    getPreferences: async () => {
        const response = await api.get("/notifications/preferences");
        return response.data;
    },

    // Update preference
    updatePreference: async (channel: string, notificationType: string, isEnabled: boolean) => {
        const response = await api.put("/notifications/preferences", {
            channel,
            notificationType,
            isEnabled,
        });
        return response.data;
    },

    // Update preferences (batch)
    updatePreferences: async (preferences: Record<string, boolean>) => {
        const response = await api.put("/notifications/preferences", preferences);
        return response.data;
    },

    // ============================================
    // DEVICE TOKEN OPERATIONS
    // ============================================

    // Register device token
    registerDeviceToken: async (token: string, platform: 'ios' | 'android' | 'web', deviceName?: string) => {
        const response = await api.post("/notifications/devices", {
            token,
            platform,
            deviceName,
        });
        return response.data;
    },

    // Unregister device token
    unregisterDeviceToken: async (token: string) => {
        const response = await api.delete("/notifications/devices", {
            data: { token },
        });
        return response.data;
    },

    // ============================================
    // ADMIN OPERATIONS
    // ============================================

    // Send notification (Admin)
    sendNotification: async (data: {
        userIds?: string[];
        role?: string;
        type: string;
        title: string;
        body: string;
        data?: Record<string, any>;
    }) => {
        const response = await api.post("/admin/notifications/send", data);
        return response.data;
    },

    // Get notification templates (Admin)
    getTemplates: async () => {
        const response = await api.get("/admin/notifications/templates");
        return response.data;
    },

    // Create template (Admin)
    createTemplate: async (data: {
        name: string;
        type: string;
        titleTemplate: string;
        bodyTemplate: string;
        channels: string[];
    }) => {
        const response = await api.post("/admin/notifications/templates", data);
        return response.data;
    },

    // Update template (Admin)
    updateTemplate: async (id: string, data: any) => {
        const response = await api.put(`/admin/notifications/templates/${id}`, data);
        return response.data;
    },
};
