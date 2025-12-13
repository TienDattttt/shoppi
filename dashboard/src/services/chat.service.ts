import api from "./api";

export interface ChatRoom {
    id: string;
    customerId: string;
    partnerId: string;
    productId?: string;
    orderId?: string;
    status: 'active' | 'closed' | 'archived';
    lastMessageAt?: string;
    unreadCount: number;
    participant: {
        id: string;
        name: string;
        avatar?: string;
        isPartner: boolean;
    };
    product?: {
        id: string;
        name: string;
        image?: string;
    };
    order?: {
        id: string;
        orderNumber: string;
        status: string;
    };
    createdAt: string;
    updatedAt?: string;
    // Aliases for convenience
    shopName?: string;
    shopAvatar?: string;
    customerName?: string;
    customerAvatar?: string;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    messageType: 'text' | 'image' | 'product' | 'order' | 'system';
    content: string | null;
    metadata?: Record<string, any>;
    isRead: boolean;
    readAt?: string;
    isDeleted?: boolean;
    deletedAt?: string;
    sender?: {
        id: string;
        name: string;
        avatar?: string;
    };
    replyTo?: {
        id: string;
        content: string;
        senderName?: string;
    };
    createdAt: string;
    updatedAt?: string;
}

export interface StartChatData {
    partnerId: string;
    productId?: string;
    orderId?: string;
}

export const chatService = {
    // Start or get chat with partner/shop
    startChat: async (data: StartChatData): Promise<ChatRoom> => {
        const response = await api.post("/chat/start", data);
        return response.data;
    },

    // Get user's chat rooms
    getChatRooms: async (params?: { page?: number; limit?: number; status?: string }): Promise<{
        data: ChatRoom[];
        pagination: { page: number; limit: number; total: number; hasMore: boolean };
    }> => {
        const response = await api.get("/chat/rooms", { params });
        return response.data;
    },

    // Get chat room details
    getChatRoom: async (roomId: string): Promise<ChatRoom> => {
        const response = await api.get(`/chat/rooms/${roomId}`);
        return response.data;
    },

    // Get messages in chat room
    getMessages: async (roomId: string, params?: { page?: number; limit?: number; before?: string }): Promise<{
        data: ChatMessage[];
        pagination: { page: number; limit: number; total: number; hasMore: boolean };
    }> => {
        const response = await api.get(`/chat/rooms/${roomId}/messages`, { params });
        return response.data;
    },

    // Send text message
    sendMessage: async (roomId: string, content: string, replyToId?: string): Promise<ChatMessage> => {
        const response = await api.post(`/chat/rooms/${roomId}/messages`, { content, replyToId });
        return response.data;
    },

    // Send image message
    sendImage: async (roomId: string, file: File, caption?: string): Promise<ChatMessage> => {
        const formData = new FormData();
        formData.append('image', file);
        if (caption) formData.append('caption', caption);
        
        const response = await api.post(`/chat/rooms/${roomId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Share product in chat
    sendProduct: async (roomId: string, productId: string, message?: string): Promise<ChatMessage> => {
        const response = await api.post(`/chat/rooms/${roomId}/product`, { productId, message });
        return response.data;
    },

    // Share order in chat
    sendOrder: async (roomId: string, orderId: string, message?: string): Promise<ChatMessage> => {
        const response = await api.post(`/chat/rooms/${roomId}/order`, { orderId, message });
        return response.data;
    },

    // Mark messages as read
    markAsRead: async (roomId: string): Promise<void> => {
        await api.put(`/chat/rooms/${roomId}/read`);
    },

    // Send typing indicator
    sendTyping: async (roomId: string, isTyping: boolean = true): Promise<void> => {
        await api.post(`/chat/rooms/${roomId}/typing`, { isTyping });
    },

    // Get unread count
    getUnreadCount: async (): Promise<{ count: number }> => {
        const response = await api.get("/chat/unread-count");
        return response.data;
    },

    // Close chat room
    closeChatRoom: async (roomId: string): Promise<ChatRoom> => {
        const response = await api.put(`/chat/rooms/${roomId}/close`);
        return response.data;
    },

    // Archive chat room
    archiveChatRoom: async (roomId: string): Promise<ChatRoom> => {
        const response = await api.put(`/chat/rooms/${roomId}/archive`);
        return response.data;
    },

    // Reopen chat room
    reopenChatRoom: async (roomId: string): Promise<ChatRoom> => {
        const response = await api.put(`/chat/rooms/${roomId}/reopen`);
        return response.data;
    },

    // Delete message
    deleteMessage: async (messageId: string): Promise<void> => {
        await api.delete(`/chat/messages/${messageId}`);
    },
};
