
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: string;
    isSender: boolean; // Helper for UI
}

import api from "./api";

export interface Message {
    _id: string; // Backend uses _id
    id?: string; // Frontend alias
    conversationId: string; // Map from room_id
    senderId: string; // Map from sender_id
    text: string; // Map from content (type=text)
    type: 'text' | 'image' | 'product' | 'order' | 'system';
    metadata?: any;
    createdAt: string;
    isSender: boolean;
}

export interface Conversation {
    id: string; // room_id
    userId: string; // partnerId or customerId depending on view, here it's customer
    userName: string;
    userAvatar: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isOnline: boolean;
}

export const chatService = {
    getConversations: async () => {
        const response = await api.get("/chat/rooms");
        // Transform backend DTO to frontend Conversation interface
        return response.data.map((room: any) => ({
            id: room._id,
            userId: room.customer._id, // As partner, the other user is customer
            userName: room.customer.name,
            userAvatar: room.customer.avatar || "https://github.com/shadcn.png",
            lastMessage: room.last_message?.content || "Started a conversation",
            lastMessageTime: room.last_message?.created_at || room.updated_at,
            unreadCount: room.unread_count || 0,
            isOnline: false // Todo: Realtime online status
        }));
    },

    getMessages: async (conversationId: string) => {
        const response = await api.get(`/chat/rooms/${conversationId}/messages`);
        return response.data.map((msg: any) => ({
            id: msg._id,
            conversationId: msg.room_id,
            senderId: msg.sender_id,
            text: msg.type === 'image' ? (msg.metadata?.url || "[Image]") : msg.content,
            type: msg.type,
            metadata: msg.metadata,
            createdAt: msg.created_at,
            isSender: msg.is_sender // Backend usually calculates this via DTO
        }));
    },

    sendMessage: async (conversationId: string, text: string) => {
        const response = await api.post(`/chat/rooms/${conversationId}/messages`, { content: text });
        const msg = response.data;
        return {
            id: msg._id,
            conversationId: msg.room_id,
            senderId: msg.sender_id,
            text: msg.content,
            type: 'text',
            createdAt: msg.created_at,
            isSender: true
        };
    },

    sendImage: async (conversationId: string, file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post(`/chat/rooms/${conversationId}/images`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        const msg = response.data;
        return {
            id: msg._id,
            conversationId: msg.room_id,
            senderId: msg.sender_id,
            text: msg.metadata?.url,
            type: 'image',
            metadata: msg.metadata,
            createdAt: msg.created_at,
            isSender: true
        };
    }
};
