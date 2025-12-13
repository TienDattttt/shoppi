import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { MessageBubble } from "@/components/customer/chat/MessageBubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Store } from "lucide-react";
import { useState, useRef } from "react";

export default function ChatPage() {
    const { user } = useAuthStore();
    const {
        conversations,
        activeConversationId,
        loading,
        setCurrentUserId,
        loadConversations,
        sendMessage,
        selectConversation,
        typingUsers,
    } = useChatStore();

    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef<number>(0);

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const isRecipientTyping = activeConversationId ? typingUsers[activeConversationId] : false;

    useEffect(() => {
        if (user?.id) {
            setCurrentUserId(user.id);
            loadConversations();
        }
    }, [user?.id]);

    // Scroll to bottom only when new messages are added
    useEffect(() => {
        const currentCount = activeConversation?.messages.length || 0;
        if (currentCount > prevMessageCountRef.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
        prevMessageCountRef.current = currentCount;
    }, [activeConversation?.messages.length]);
    
    // Reset message count when switching conversations
    useEffect(() => {
        prevMessageCountRef.current = 0;
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [activeConversationId]);

    const handleSend = async () => {
        if (!inputText.trim() || sending) return;
        setSending(true);
        const text = inputText;
        setInputText("");
        try {
            await sendMessage(text);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (loading && conversations.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    return (
        <div className="flex border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}>
            {/* Chat List */}
            <div className="w-1/3 min-w-[250px] border-r bg-gray-50 flex flex-col">
                <div className="p-4 border-b bg-white shrink-0">
                    <h2 className="font-semibold text-lg">Tin nhắn</h2>
                </div>
                <div className="overflow-y-auto flex-1">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            Chưa có cuộc trò chuyện nào
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => selectConversation(conv.id)}
                                className={`flex gap-3 p-3 cursor-pointer hover:bg-gray-100 border-b ${
                                    activeConversationId === conv.id ? 'bg-orange-50' : ''
                                }`}
                            >
                                <img
                                    src={conv.recipientAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.recipientName)}&background=random`}
                                    alt="avatar"
                                    className="h-10 w-10 rounded-full"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between">
                                        <span className={`font-medium text-sm truncate ${activeConversationId === conv.id ? 'text-shopee-orange' : ''}`}>
                                            {conv.recipientName}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-1.5 rounded-full h-5 min-w-[20px] flex items-center justify-center">
                                        {conv.unreadCount}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b bg-white flex items-center gap-3 shrink-0">
                            <img
                                src={activeConversation.recipientAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConversation.recipientName)}&background=random`}
                                alt="avatar"
                                className="h-10 w-10 rounded-full"
                            />
                            <div>
                                <div className="font-medium">{activeConversation.recipientName}</div>
                                <div className="text-xs text-gray-500">
                                    {activeConversation.online ? '● Online' : 'Offline'}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div 
                            ref={messagesContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 min-h-0"
                        >
                            {activeConversation.messages.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    Bắt đầu cuộc trò chuyện
                                </div>
                            ) : (
                                activeConversation.messages.map(msg => (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        isOwn={msg.senderId === user?.id}
                                    />
                                ))
                            )}
                            {isRecipientTyping && (
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                    <span>Đang nhập...</span>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t bg-white shrink-0">
                            <div className="flex gap-2">
                                <Input
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1"
                                    disabled={sending}
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={sending || !inputText.trim()}
                                    className="bg-shopee-orange hover:bg-shopee-orange-hover"
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center flex-col text-gray-400 gap-2">
                        <div className="h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center">
                            <Store className="h-10 w-10 text-white" />
                        </div>
                        <p>Chọn cuộc trò chuyện để bắt đầu</p>
                    </div>
                )}
            </div>
        </div>
    );
}
