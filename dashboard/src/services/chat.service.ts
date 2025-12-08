import api from "./api";

export interface ChatRoom {
    id: string;
    customer_id: string;
    shop_id: string;
    last_message: string | null;
    last_message_at: string | null;
    customer_unread_count: number;
    shop_unread_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Relations
    customer?: { id: string; full_name: string; avatar_url: string | null };
    shop?: { id: string; shop_name: string; logo_url: string | null };
}

export interface ChatMessage {
    id: string;
    room_id: string;
    sender_id: string;
    sender_type: 'customer' | 'shop';
    message_type: 'text' | 'image' | 'product' | 'order';
    content: string;
    metadata: Record<string, any> | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
}

export interface SendMessageData {
    roomId: string;
    messageType: 'text' | 'image' | 'product' | 'order';
    content: string;
    metadata?: Record<string, any>;
}

export const chatService = {
    // ============================================
    // CONVERSATION OPERATIONS
    // ============================================

    // Get conversations
    getConversations: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get("/chat/conversations", { params });
        return response.data;
    },

    // Create conversation (Customer initiates chat with shop)
    createConversation: async (shopId: string) => {
        const response = await api.post("/chat/conversations", { shopId });
        return response.data;
    },

    // Get conversation by ID
    getConversationById: async (id: string) => {
        const response = await api.get(`/chat/conversations/${id}`);
        return response.data;
    },

    // Get or create conversation with shop
    getOrCreateConversation: async (shopId: string) => {
        const response = await api.post("/chat/conversations/find-or-create", { shopId });
        return response.data;
    },

    // ============================================
    // MESSAGE OPERATIONS
    // ============================================

    // Get messages
    getMessages: async (roomId: string, params?: { page?: number; limit?: number; before?: string }) => {
        const response = await api.get("/chat/messages", { 
            params: { conversationId: roomId, ...params } 
        });
        return response.data;
    },

    // Send message
    sendMessage: async (data: SendMessageData) => {
        const response = await api.post("/chat/messages", data);
        return response.data;
    },

    // Mark messages as read
    markAsRead: async (roomId: string) => {
        const response = await api.patch(`/chat/conversations/${roomId}/read`);
        return response.data;
    },

    // ============================================
    // UNREAD COUNT
    // ============================================

    // Get total unread count
    getUnreadCount: async () => {
        const response = await api.get("/chat/unread/count");
        return response.data;
    },

    // ============================================
    // IMAGE UPLOAD
    // ============================================

    // Upload chat image
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await api.post("/chat/upload", formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};
