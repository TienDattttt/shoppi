import { create } from 'zustand';
import { chatService } from '@/services/chat.service';
import { supabase, isRealtimeAvailable } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
    id: string;
    senderId: string;
    text: string;
    type: 'text' | 'image' | 'product' | 'order' | 'system';
    metadata?: Record<string, any>;
    timestamp: Date;
    isRead: boolean;
}

export interface Conversation {
    id: string;
    recipientId: string;
    recipientName: string;
    recipientAvatar: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    messages: Message[];
    online: boolean;
    isShop?: boolean;
}

interface ChatState {
    isOpen: boolean;
    isMinimized: boolean;
    activeConversationId: string | null;
    conversations: Conversation[];
    loading: boolean;
    currentUserId: string | null;
    typingUsers: Record<string, boolean>; // roomId -> isTyping

    // Actions
    setCurrentUserId: (userId: string) => void;
    toggleChat: () => void;
    minimizeChat: (minimized: boolean) => void;
    selectConversation: (id: string) => void;
    sendMessage: (text: string) => Promise<void>;
    openChatWithShop: (shopId: string, partnerId: string, shopName: string, shopAvatar: string) => Promise<void>;
    loadConversations: () => Promise<void>;
    loadMessages: (roomId: string) => Promise<void>;
    addMessage: (roomId: string, message: Message) => void;
    subscribeToRoom: (roomId: string) => void;
    unsubscribeFromRoom: (roomId: string) => void;
    setTyping: (roomId: string, isTyping: boolean) => void;
}

// Store active channel subscriptions
const activeChannels: Map<string, RealtimeChannel> = new Map();

// Polling interval for fallback (only when realtime is not available)
let conversationPollingInterval: ReturnType<typeof setInterval> | null = null;
let pollingStarted = false;

function startPolling() {
    // Only start polling once and only if realtime is not available
    if (pollingStarted) return;
    pollingStarted = true;
    
    // Poll conversations every 30 seconds to refresh unread counts (fallback only)
    if (!conversationPollingInterval) {
        conversationPollingInterval = setInterval(async () => {
            const state = useChatStore.getState();
            const { currentUserId, activeConversationId, conversations: existingConvs } = state;
            
            if (currentUserId) {
                try {
                    const result = await chatService.getChatRooms({ limit: 50 });
                    
                    // Log unread counts from server
                    const serverUnreadCounts = result.data.map(r => ({ id: r.id, unread: r.unreadCount }));
                    const totalServerUnread = result.data.reduce((acc, r) => acc + r.unreadCount, 0);
                    const totalLocalUnread = existingConvs.reduce((acc, c) => acc + c.unreadCount, 0);
                    
                    if (totalServerUnread !== totalLocalUnread) {
                        console.log('[Chat] Polling conversations - unread mismatch:', { 
                            serverTotal: totalServerUnread, 
                            localTotal: totalLocalUnread,
                            serverCounts: serverUnreadCounts 
                        });
                    }
                    
                    // Update unread counts from server
                    useChatStore.setState((prevState) => ({
                        conversations: prevState.conversations.map(conv => {
                            const serverConv = result.data.find(r => r.id === conv.id);
                            if (serverConv) {
                                // If this is active conversation, keep unread at 0
                                const unreadCount = conv.id === activeConversationId ? 0 : serverConv.unreadCount;
                                return { ...conv, unreadCount };
                            }
                            return conv;
                        })
                    }));
                    
                    // Add any new conversations from server
                    const existingIds = state.conversations.map(c => c.id);
                    const newConvs = result.data.filter(r => !existingIds.includes(r.id));
                    
                    if (newConvs.length > 0) {
                        const newConversations: Conversation[] = newConvs.map(room => ({
                            id: room.id,
                            recipientId: room.participant?.id || (room.customerId === currentUserId ? room.partnerId : room.customerId),
                            recipientName: room.participant?.name || 'User',
                            recipientAvatar: room.participant?.avatar || '',
                            lastMessage: '',
                            lastMessageTime: room.lastMessageAt ? new Date(room.lastMessageAt) : new Date(room.createdAt),
                            unreadCount: room.unreadCount,
                            online: false,
                            messages: [],
                            isShop: room.participant?.isPartner || room.customerId === currentUserId
                        }));
                        
                        useChatStore.setState((prevState) => ({
                            conversations: [...newConversations, ...prevState.conversations]
                        }));
                        
                        // Subscribe to new rooms
                        newConversations.forEach(conv => {
                            state.subscribeToRoom(conv.id);
                        });
                    }
                } catch (error) {
                    // Silently fail polling
                }
            }
        }, 30000); // Poll every 30 seconds instead of 5
    }
}

function stopPolling() {
    if (conversationPollingInterval) {
        clearInterval(conversationPollingInterval);
        conversationPollingInterval = null;
    }
    pollingStarted = false;
}

export const useChatStore = create<ChatState>((set, get) => ({
    isOpen: false,
    isMinimized: true,
    activeConversationId: null,
    conversations: [],
    loading: false,
    currentUserId: null,
    typingUsers: {},

    setCurrentUserId: (userId) => set({ currentUserId: userId }),

    toggleChat: () => set((state) => ({ isOpen: !state.isOpen, isMinimized: false })),

    minimizeChat: (minimized) => set({ isMinimized: minimized }),

    selectConversation: async (id) => {
        const previousId = get().activeConversationId;
        
        // Unsubscribe from previous room
        if (previousId && previousId !== id) {
            get().unsubscribeFromRoom(previousId);
        }
        
        set({ activeConversationId: id });
        
        // Mark as read
        try {
            await chatService.markAsRead(id);
            set((state) => ({
                conversations: state.conversations.map(c =>
                    c.id === id ? { ...c, unreadCount: 0 } : c
                )
            }));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
        
        // Load messages if not loaded
        const conv = get().conversations.find(c => c.id === id);
        if (conv && conv.messages.length === 0) {
            await get().loadMessages(id);
        }
        
        // Subscribe to realtime updates
        get().subscribeToRoom(id);
    },

    sendMessage: async (text) => {
        const { activeConversationId, currentUserId } = get();
        if (!activeConversationId || !text.trim()) return;

        // Optimistic update
        const tempMessage: Message = {
            id: `temp_${Date.now()}`,
            senderId: currentUserId || 'user',
            text,
            type: 'text',
            timestamp: new Date(),
            isRead: false
        };

        set((state) => ({
            conversations: state.conversations.map(c => {
                if (c.id === activeConversationId) {
                    return {
                        ...c,
                        messages: [...c.messages, tempMessage],
                        lastMessage: text,
                        lastMessageTime: new Date()
                    };
                }
                return c;
            })
        }));

        try {
            const message = await chatService.sendMessage(activeConversationId, text);
            
            // Replace temp message with real one
            set((state) => ({
                conversations: state.conversations.map(c => {
                    if (c.id === activeConversationId) {
                        return {
                            ...c,
                            messages: c.messages.map(m => 
                                m.id === tempMessage.id 
                                    ? {
                                        id: message.id,
                                        senderId: message.senderId,
                                        text: message.content || '',
                                        type: message.messageType || 'text',
                                        metadata: message.metadata,
                                        timestamp: new Date(message.createdAt),
                                        isRead: message.isRead
                                    }
                                    : m
                            )
                        };
                    }
                    return c;
                })
            }));
        } catch (error) {
            console.error('Failed to send message:', error);
            // Remove temp message on error
            set((state) => ({
                conversations: state.conversations.map(c => {
                    if (c.id === activeConversationId) {
                        return {
                            ...c,
                            messages: c.messages.filter(m => m.id !== tempMessage.id)
                        };
                    }
                    return c;
                })
            }));
        }
    },

    openChatWithShop: async (_shopId, partnerId, shopName, shopAvatar) => {
        console.log('[Chat] Opening chat with shop:', { _shopId, partnerId, shopName });
        set({ loading: true });
        
        try {
            // Start or get existing chat room
            console.log('[Chat] Calling startChat API...');
            const room = await chatService.startChat({ partnerId });
            console.log('[Chat] Room created/found:', room);
            
            const existing = get().conversations.find(c => c.id === room.id);
            if (existing) {
                set({
                    isOpen: true,
                    isMinimized: false,
                    activeConversationId: room.id,
                    loading: false
                });
                await get().loadMessages(room.id);
                get().subscribeToRoom(room.id);
                return;
            }

            const newConv: Conversation = {
                id: room.id,
                recipientId: partnerId,
                recipientName: shopName || room.participant?.name || 'Shop',
                recipientAvatar: shopAvatar || room.participant?.avatar || '',
                lastMessage: '',
                lastMessageTime: room.lastMessageAt ? new Date(room.lastMessageAt) : new Date(),
                unreadCount: room.unreadCount || 0,
                online: false,
                messages: [],
                isShop: true
            };

            set((state) => ({
                isOpen: true,
                isMinimized: false,
                activeConversationId: room.id,
                conversations: [newConv, ...state.conversations],
                loading: false
            }));
            
            await get().loadMessages(room.id);
            get().subscribeToRoom(room.id);
        } catch (error) {
            console.error('[Chat] Failed to start chat:', error);
            set({ loading: false });
        }
    },

    loadConversations: async () => {
        const { conversations: existingConvs, activeConversationId } = get();
        
        // Don't show loading if we already have data (background refresh)
        if (existingConvs.length === 0) {
            set({ loading: true });
        }
        
        try {
            const result = await chatService.getChatRooms({ limit: 50 });
            // Get currentUserId after API call to ensure it's set
            const { currentUserId } = get();
            console.log('[Chat] Loaded rooms from server:', result.data.length, 'rooms, currentUserId:', currentUserId);
            
            const newConversations: Conversation[] = result.data.map(room => {
                // Preserve existing messages and local unread count if we have them
                const existing = existingConvs.find(c => c.id === room.id);
                
                // Use server unread count, but keep 0 if this is active conversation
                const unreadCount = room.id === activeConversationId ? 0 : room.unreadCount;
                
                console.log('[Chat] Room:', room.id, 'serverUnread:', room.unreadCount, 'finalUnread:', unreadCount);
                
                return {
                    id: room.id,
                    recipientId: room.participant?.id || (room.customerId === currentUserId ? room.partnerId : room.customerId),
                    recipientName: room.participant?.name || 'User',
                    recipientAvatar: room.participant?.avatar || '',
                    lastMessage: existing?.lastMessage || '',
                    lastMessageTime: room.lastMessageAt ? new Date(room.lastMessageAt) : new Date(room.createdAt),
                    unreadCount,
                    online: false,
                    messages: existing?.messages || [],
                    isShop: room.participant?.isPartner || room.customerId === currentUserId
                };
            });

            set({ conversations: newConversations, loading: false });
            
            // Subscribe to all rooms for realtime updates
            newConversations.forEach(conv => {
                get().subscribeToRoom(conv.id);
            });
            
            // Start polling as fallback for realtime
            startPolling();
        } catch (error) {
            console.error('Failed to load conversations:', error);
            set({ loading: false });
        }
    },

    loadMessages: async (roomId) => {
        try {
            const result = await chatService.getMessages(roomId, { limit: 50 });
            
            const messages: Message[] = result.data.map(msg => ({
                id: msg.id,
                senderId: msg.senderId,
                text: msg.content || '',
                type: msg.messageType || 'text',
                metadata: msg.metadata,
                timestamp: new Date(msg.createdAt),
                isRead: msg.isRead
            }));

            set((state) => ({
                conversations: state.conversations.map(c =>
                    c.id === roomId ? { ...c, messages } : c
                )
            }));
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    },

    subscribeToRoom: (roomId) => {
        if (!isRealtimeAvailable() || !supabase) {
            console.log('Realtime not available, skipping subscription');
            return;
        }
        
        // Don't subscribe if already subscribed
        if (activeChannels.has(roomId)) {
            return;
        }
        
        const channelName = `chat_room_${roomId}`;
        console.log(`[Chat] Subscribing to room: ${channelName}`);
        
        const channel = supabase
            .channel(channelName)
            .on('broadcast', { event: 'new_message' }, (payload: { payload?: { message?: { id: string; senderId: string; content?: string; messageType?: string; metadata?: Record<string, unknown>; createdAt: string } } }) => {
                console.log('[Chat] Received new message:', payload);
                const msg = payload.payload?.message;
                if (msg && msg.senderId !== get().currentUserId) {
                    get().addMessage(roomId, {
                        id: msg.id,
                        senderId: msg.senderId,
                        text: msg.content || '',
                        type: (msg.messageType as Message['type']) || 'text',
                        metadata: msg.metadata as Record<string, unknown> | undefined,
                        timestamp: new Date(msg.createdAt),
                        isRead: false
                    });
                }
            })
            .on('broadcast', { event: 'user_typing' }, (payload: { payload?: { userId?: string; isTyping?: boolean } }) => {
                console.log('[Chat] User typing:', payload);
                const { userId, isTyping } = payload.payload || {};
                if (userId && userId !== get().currentUserId) {
                    set((state) => ({
                        typingUsers: { ...state.typingUsers, [roomId]: isTyping ?? false }
                    }));
                    
                    // Clear typing indicator after 3 seconds
                    if (isTyping) {
                        setTimeout(() => {
                            set((state) => ({
                                typingUsers: { ...state.typingUsers, [roomId]: false }
                            }));
                        }, 3000);
                    }
                }
            })
            .on('broadcast', { event: 'messages_read' }, (payload: { payload?: unknown }) => {
                console.log('[Chat] Messages read:', payload);
                // Update read status if needed
            })
            .subscribe((status: string) => {
                console.log(`[Chat] Subscription status for ${channelName}:`, status);
            });
        
        activeChannels.set(roomId, channel);
    },

    unsubscribeFromRoom: (roomId) => {
        const channel = activeChannels.get(roomId);
        if (channel && supabase) {
            console.log(`[Chat] Unsubscribing from room: ${roomId}`);
            supabase.removeChannel(channel);
            activeChannels.delete(roomId);
        }
    },

    setTyping: async (roomId, isTyping) => {
        try {
            await chatService.sendTyping(roomId, isTyping);
        } catch (error) {
            console.error('Failed to send typing indicator:', error);
        }
    },

    addMessage: (roomId, message) => {
        const { currentUserId, activeConversationId } = get();
        
        const shouldIncrementUnread = activeConversationId !== roomId && message.senderId !== currentUserId;
        console.log('[Chat] addMessage:', { 
            roomId, 
            messageId: message.id,
            senderId: message.senderId,
            currentUserId,
            activeConversationId,
            shouldIncrementUnread 
        });
        
        set((state) => ({
            conversations: state.conversations.map(c => {
                if (c.id === roomId) {
                    // Don't add if message already exists
                    if (c.messages.some(m => m.id === message.id)) {
                        return c;
                    }
                    
                    const newUnreadCount = shouldIncrementUnread ? c.unreadCount + 1 : c.unreadCount;
                    console.log('[Chat] Updating conversation unread:', { roomId, oldCount: c.unreadCount, newCount: newUnreadCount });
                    
                    return {
                        ...c,
                        messages: [...c.messages, message],
                        lastMessage: message.text,
                        lastMessageTime: message.timestamp,
                        unreadCount: newUnreadCount
                    };
                }
                return c;
            })
        }));
    }
}));
