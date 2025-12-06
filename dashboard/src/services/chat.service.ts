
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: string;
    isSender: boolean; // Helper for UI
}

export interface Conversation {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isOnline: boolean;
}

const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: "c1",
        userId: "u1",
        userName: "Nguyen Van Khach 1",
        userAvatar: "https://avatar.vercel.sh/1",
        lastMessage: "Cho mình hỏi sản phẩm này còn màu đen không?",
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        unreadCount: 1,
        isOnline: true
    },
    {
        id: "c2",
        userId: "u2",
        userName: "Tran Thi B",
        userAvatar: "https://avatar.vercel.sh/2",
        lastMessage: "Cảm ơn shop nhé!",
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        unreadCount: 0,
        isOnline: false
    },
    {
        id: "c3",
        userId: "u3",
        userName: "Le Van C",
        userAvatar: "https://avatar.vercel.sh/3",
        lastMessage: "Bao lâu thì giao hàng ạ?",
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        unreadCount: 2,
        isOnline: true
    }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
    "c1": [
        { id: "m1", conversationId: "c1", senderId: "u1", text: "Xin chào shop", createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), isSender: false },
        { id: "m2", conversationId: "c1", senderId: "u1", text: "Cho mình hỏi sản phẩm này còn màu đen không?", createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), isSender: false }
    ],
    "c2": [
        { id: "m3", conversationId: "c2", senderId: "shop", text: "Đơn hàng của bạn đã được gửi đi ạ", createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), isSender: true },
        { id: "m4", conversationId: "c2", senderId: "u2", text: "Cảm ơn shop nhé!", createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), isSender: false }
    ],
    "c3": [
        { id: "m5", conversationId: "c3", senderId: "u3", text: "Bao lâu thì giao hàng ạ?", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), isSender: false }
    ]
};

export const chatService = {
    getConversations: async () => {
        return new Promise<Conversation[]>((resolve) => {
            setTimeout(() => {
                resolve([...MOCK_CONVERSATIONS]);
            }, 500);
        });
    },

    getMessages: async (conversationId: string) => {
        return new Promise<Message[]>((resolve) => {
            setTimeout(() => {
                resolve(MOCK_MESSAGES[conversationId] || []);
            }, 300);
        });
    },

    sendMessage: async (conversationId: string, text: string) => {
        return new Promise<Message>((resolve) => {
            setTimeout(() => {
                resolve({
                    id: Math.random().toString(36).substr(2, 9),
                    conversationId,
                    senderId: "shop", // Assumed current user is shop
                    text,
                    createdAt: new Date().toISOString(),
                    isSender: true
                });
            }, 300);
        });
    }
};
