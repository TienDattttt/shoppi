import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { PartnerChatList } from "./PartnerChatList";
import { X, Minus, Send, Smile, Image as ImageIcon, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { cn, debounce } from "@/lib/utils";
import dayjs from "dayjs";

export function PartnerChatWindow() {
    const { 
        isOpen, 
        isMinimized, 
        toggleChat, 
        minimizeChat, 
        conversations, 
        activeConversationId, 
        sendMessage,
        loading,
        setCurrentUserId,
        loadConversations,
        typingUsers,
        setTyping
    } = useChatStore();
    
    const { user } = useAuthStore();
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const isRecipientTyping = activeConversationId ? typingUsers[activeConversationId] : false;

    // Debounced typing indicator
    const sendTypingIndicator = useCallback(
        debounce((roomId: string, isTyping: boolean) => {
            setTyping(roomId, isTyping);
        }, 300),
        [setTyping]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        
        if (activeConversationId && e.target.value.length > 0) {
            sendTypingIndicator(activeConversationId, true);
            
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            typingTimeoutRef.current = setTimeout(() => {
                if (activeConversationId) {
                    setTyping(activeConversationId, false);
                }
            }, 2000);
        }
    };

    // Set current user ID and load conversations on mount
    useEffect(() => {
        if (user?.id) {
            setCurrentUserId(user.id);
            loadConversations();
        }
    }, [user?.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeConversation?.messages]);

    if (!isOpen) return null;

    if (isMinimized) {
        const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
        return (
            <div
                className="fixed bottom-0 right-4 w-72 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)] rounded-t-lg overflow-hidden z-50 cursor-pointer border border-gray-200"
                onClick={() => minimizeChat(false)}
            >
                <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                        <span className="animate-pulse h-2 w-2 bg-green-400 rounded-full"></span>
                        Chat với khách hàng {totalUnread > 0 && `(${totalUnread})`}
                    </div>
                </div>
            </div>
        );
    }

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

    return (
        <div className="fixed bottom-0 right-4 w-[650px] h-[550px] bg-white shadow-[0_-2px_20px_rgba(0,0,0,0.2)] rounded-t-lg z-50 flex flex-col border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white shrink-0 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="font-medium flex items-center gap-2">
                    <span className="text-lg">Chat với khách hàng</span>
                    {activeConversation && (
                        <>
                            <span className="text-blue-200">|</span>
                            <span className="text-sm font-normal">{activeConversation.recipientName}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => minimizeChat(true)} className="hover:bg-white/20 p-1 rounded">
                        <Minus className="h-5 w-5" />
                    </button>
                    <button onClick={toggleChat} className="hover:bg-white/20 p-1 rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* List */}
                <PartnerChatList />

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-gray-50 h-full">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : activeConversation ? (
                        <>
                            {/* Chat Header Info */}
                            <div className="bg-white border-b px-4 py-2 flex justify-between items-center text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Khách hàng
                                </div>
                                <div>
                                    {activeConversation.online ? (
                                        <span className="text-green-500">● Online</span>
                                    ) : (
                                        <span>Offline</span>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {activeConversation.messages.length === 0 ? (
                                    <div className="text-center text-gray-400 py-8">
                                        <p>Bắt đầu cuộc trò chuyện với khách hàng</p>
                                    </div>
                                ) : (
                                    activeConversation.messages.map(msg => (
                                        <div 
                                            key={msg.id}
                                            className={cn("flex w-full mb-3", msg.senderId === user?.id ? "justify-end" : "justify-start")}
                                        >
                                            <div className={cn(
                                                "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                                                msg.senderId === user?.id 
                                                    ? "bg-blue-600 text-white rounded-br-none" 
                                                    : "bg-white border rounded-bl-none text-gray-800 shadow-sm"
                                            )}>
                                                <div>{msg.text}</div>
                                                <div className={cn(
                                                    "text-[10px] mt-1 text-right", 
                                                    msg.senderId === user?.id ? "text-blue-100" : "text-gray-400"
                                                )}>
                                                    {dayjs(msg.timestamp).format('HH:mm')}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {/* Typing indicator */}
                                {isRecipientTyping && (
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                        <span>{activeConversation.recipientName} đang nhập...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="bg-white p-3 border-t">
                                <div className="flex gap-2 items-center mb-2 text-gray-400">
                                    <Smile className="h-5 w-5 cursor-pointer hover:text-blue-600" />
                                    <ImageIcon className="h-5 w-5 cursor-pointer hover:text-blue-600" />
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={inputText}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Nhập tin nhắn..."
                                        className="flex-1 border-gray-200 focus-visible:ring-blue-600"
                                        disabled={sending}
                                    />
                                    <Button 
                                        onClick={handleSend} 
                                        size="icon" 
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={sending || !inputText.trim()}
                                    >
                                        {sending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center flex-col text-gray-400 gap-2">
                            <div className="h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="h-10 w-10 text-white" />
                            </div>
                            <p>Chọn cuộc trò chuyện để bắt đầu</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
