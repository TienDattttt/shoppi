import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { ChatList } from "./ChatList";
import { MessageBubble } from "./MessageBubble";
import { X, Minus, Send, Smile, Image as ImageIcon, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChatWindow() {
    const { isOpen, isMinimized, toggleChat, minimizeChat, conversations, activeConversationId, sendMessage } = useChatStore();
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeConversation?.messages]);

    if (!isOpen) return null;

    if (isMinimized) {
        return (
            <div
                className="fixed bottom-0 right-4 w-72 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)] rounded-t-lg overflow-hidden z-50 cursor-pointer border border-gray-200"
                onClick={() => minimizeChat(false)}
            >
                <div className="bg-shopee-orange text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                        <span className="animate-pulse h-2 w-2 bg-green-400 rounded-full"></span>
                        Chat ({conversations.reduce((acc, c) => acc + c.unreadCount, 0)})
                    </div>
                </div>
            </div>
        );
    }

    const handleSend = () => {
        if (inputText.trim()) {
            sendMessage(inputText);
            setInputText("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-0 right-4 w-[600px] h-[500px] bg-white shadow-[0_-2px_20px_rgba(0,0,0,0.2)] rounded-t-lg z-50 flex flex-col border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-shopee-orange text-white shrink-0 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="font-medium flex items-center gap-2">
                    <span className="text-lg">Chat</span>
                    {activeConversation && (
                        <>
                            <span className="text-orange-200">|</span>
                            <span className="text-sm font-normal">{activeConversation.shopName}</span>
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
                <ChatList />

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-gray-50 h-full">
                    {activeConversation ? (
                        <>
                            {/* Chat Header Info */}
                            <div className="bg-white border-b px-4 py-2 flex justify-between items-center text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Store className="h-3 w-3" />
                                    Visit Shop
                                </div>
                                <div>Average response time: 5 mins</div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {activeConversation.messages.map(msg => (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        isOwn={msg.senderId === 'user'}
                                    />
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="bg-white p-3 border-t">
                                <div className="flex gap-2 items-center mb-2 text-gray-400">
                                    <Smile className="h-5 w-5 cursor-pointer hover:text-shopee-orange" />
                                    <ImageIcon className="h-5 w-5 cursor-pointer hover:text-shopee-orange" />
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message..."
                                        className="flex-1 border-gray-200 focus-visible:ring-shopee-orange"
                                    />
                                    <Button onClick={handleSend} size="icon" className="bg-shopee-orange hover:bg-shopee-orange-hover text-white">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center flex-col text-gray-400 gap-2">
                            <div className="h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center">
                                <Store className="h-10 w-10 text-white" />
                            </div>
                            <p>Select a conversation to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
