import { create } from 'zustand';
import { chatService, type Conversation, type Message } from '@/services/chat.service';

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    activeConversation: Conversation | null;
    messages: Message[];
    loadingConversations: boolean;
    loadingMessages: boolean;

    fetchConversations: () => Promise<void>;
    selectConversation: (conversationId: string) => Promise<void>;
    sendMessage: (text: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    activeConversation: null,
    messages: [],
    loadingConversations: false,
    loadingMessages: false,

    fetchConversations: async () => {
        set({ loadingConversations: true });
        try {
            const data = await chatService.getConversations();
            set({ conversations: data, loadingConversations: false });

            // Auto select first conversation if none selected
            if (!get().activeConversationId && data.length > 0) {
                get().selectConversation(data[0].id);
            }
        } catch (error) {
            console.error(error);
            set({ loadingConversations: false });
        }
    },

    selectConversation: async (conversationId: string) => {
        const { conversations } = get();
        const active = conversations.find(c => c.id === conversationId) || null;

        set({
            activeConversationId: conversationId,
            activeConversation: active,
            loadingMessages: true
        });

        try {
            const msgs = await chatService.getMessages(conversationId);
            set({ messages: msgs, loadingMessages: false });
        } catch (error) {
            console.error(error);
            set({ loadingMessages: false });
        }
    },

    sendMessage: async (text: string) => {
        const { activeConversationId, messages } = get();
        if (!activeConversationId) return;

        // Optimistic update (optional, but let's wait for mock response for simplicity)
        try {
            const newMessage = await chatService.sendMessage(activeConversationId, text);
            set({ messages: [...messages, newMessage] });

            // Mock auto-reply
            setTimeout(() => {
                const reply: Message = {
                    id: Math.random().toString(36).substr(2, 9),
                    conversationId: activeConversationId,
                    senderId: "customer",
                    text: "Cảm ơn shop đã phản hồi!",
                    createdAt: new Date().toISOString(),
                    isSender: false
                };
                set(state => ({
                    messages: state.activeConversationId === activeConversationId ? [...state.messages, reply] : state.messages
                }));
            }, 2000);

        } catch (error) {
            console.error("Failed to send message", error);
        }
    }
}));
