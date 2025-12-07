import { create } from 'zustand';

export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Date;
    isRead: boolean;
}

export interface Conversation {
    id: string; // shopId
    shopName: string;
    shopAvatar: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    messages: Message[];
    online: boolean;
}

interface ChatState {
    isOpen: boolean;
    isMinimized: boolean;
    activeConversationId: string | null;
    conversations: Conversation[];

    toggleChat: () => void;
    minimizeChat: (minimized: boolean) => void;
    selectConversation: (id: string) => void;
    sendMessage: (text: string) => void;
    openChatWithShop: (shopId: string, shopName: string, shopAvatar: string) => void;
}

// Mock Data
const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: "shop1",
        shopName: "Official Store VN",
        shopAvatar: "https://github.com/shadcn.png",
        lastMessage: "Thank you for your order!",
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 5),
        unreadCount: 2,
        online: true,
        messages: [
            { id: "m1", senderId: "user", text: "Is this item available?", timestamp: new Date(Date.now() - 1000 * 60 * 60), isRead: true },
            { id: "m2", senderId: "shop1", text: "Yes, it is in stock.", timestamp: new Date(Date.now() - 1000 * 60 * 55), isRead: true },
            { id: "m3", senderId: "shop1", text: "Thank you for your order!", timestamp: new Date(Date.now() - 1000 * 60 * 5), isRead: false },
        ]
    },
    {
        id: "shop2",
        shopName: "Fashion Hub",
        shopAvatar: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=100&auto=format&fit=crop&q=60",
        lastMessage: "We can ship it tomorrow.",
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
        unreadCount: 0,
        online: false,
        messages: [
            { id: "m4", senderId: "user", text: "When can you ship?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), isRead: true },
            { id: "m5", senderId: "shop2", text: "We can ship it tomorrow.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), isRead: true },
        ]
    }
];

export const useChatStore = create<ChatState>((set, get) => ({
    isOpen: false,
    isMinimized: true,
    activeConversationId: null,
    conversations: MOCK_CONVERSATIONS,

    toggleChat: () => set((state) => ({ isOpen: !state.isOpen, isMinimized: false })),

    minimizeChat: (minimized) => set({ isMinimized: minimized }),

    selectConversation: (id) => set((state) => ({
        activeConversationId: id,
        // Mark as read
        conversations: state.conversations.map(c =>
            c.id === id ? { ...c, unreadCount: 0 } : c
        )
    })),

    sendMessage: (text) => set((state) => {
        const { activeConversationId, conversations } = state;
        if (!activeConversationId) return {};

        const newMessage: Message = {
            id: Date.now().toString(),
            senderId: "user",
            text,
            timestamp: new Date(),
            isRead: false
        };

        const updatedConversations = conversations.map(c => {
            if (c.id === activeConversationId) {
                return {
                    ...c,
                    messages: [...c.messages, newMessage],
                    lastMessage: text,
                    lastMessageTime: new Date()
                };
            }
            return c;
        });

        // Move active conversation to top
        const activeConv = updatedConversations.find(c => c.id === activeConversationId);
        const otherConvs = updatedConversations.filter(c => c.id !== activeConversationId);

        return {
            conversations: activeConv ? [activeConv, ...otherConvs] : updatedConversations
        };
    }),

    openChatWithShop: (shopId, shopName, shopAvatar) => set((state) => {
        const existing = state.conversations.find(c => c.id === shopId);
        if (existing) {
            return {
                isOpen: true,
                isMinimized: false,
                activeConversationId: shopId
            };
        }

        const newConv: Conversation = {
            id: shopId,
            shopName,
            shopAvatar,
            lastMessage: "",
            lastMessageTime: new Date(),
            unreadCount: 0,
            online: false,
            messages: []
        };

        return {
            isOpen: true,
            isMinimized: false,
            activeConversationId: shopId,
            conversations: [newConv, ...state.conversations]
        };
    })
}));
