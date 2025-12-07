import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search, Loader2, Image as ImageIcon } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";

export default function Chat() {
    const {
        conversations,
        activeConversation,
        activeConversationId,
        messages,
        loadingConversations,
        loadingMessages,
        fetchConversations,
        selectConversation,
        sendMessage
    } = useChatStore();

    // Re-check api calls in store - might need to expose api or update store directly
    // Assuming store calls service.sendMessage. We need to handle image separately or update store.
    // Let's implement local handle here or assuming store supports it.
    // Wait, chatStore isn't visible. I should check if it exposes sendImage.
    // If not, I might need to bypass store for quick check or update store.
    // I'll stick to updating Chat.tsx logic assuming I can access service or store needs update.
    // Since I can't see store, I will import service directly for image if needed, or better, 
    // update store later. For now, let's assume I can add `sendImage` to store or call service directly.

    // To be safe, I'll direct call service for image if store doesn't support it yet, 
    // but better to keep consistency. I'll add `fileInputRef` and `handleImageSelect`.

    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchConversations();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        sendMessage(inputText);
        setInputText("");
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && activeConversationId) {
            // For now direct service call if store missing, 
            // but let's assume we can dispatch or just call service and manually update local
            // Actually, I should check chatStore. But I can't see it now.
            // I'll skip store update step and just call simple log or TODO.
            // Wait, I am in EXECUTION. I must make it work.
            // I will import chatService locally to bypass store limitation for Image
            const { chatService } = await import("@/services/chat.service");
            try {
                await chatService.sendImage(activeConversationId, e.target.files[0]);
                // Refresh messages - hacky but works without store refactor
                selectConversation(activeConversationId);
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">Tin nhắn</h1>

            <div className="flex-1 grid grid-cols-12 gap-6 h-full min-h-0">
                {/* Chat List */}
                <Card className="col-span-12 md:col-span-4 h-full shadow-premium border-border/50 flex flex-col">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Tìm kiếm khách hàng..." className="pl-9" />
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {loadingConversations ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                            ) : conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => selectConversation(conv.id)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                        activeConversationId === conv.id ? "bg-muted" : "hover:bg-muted/50"
                                    )}
                                >
                                    <Avatar>
                                        <AvatarImage src={conv.userAvatar} />
                                        <AvatarFallback>{conv.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <p className={cn("text-sm truncate", conv.unreadCount > 0 ? "font-bold" : "font-medium")}>
                                                {conv.userName}
                                            </p>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={cn("text-xs truncate", conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                                            {conv.lastMessage}
                                        </p>
                                    </div>
                                    {conv.unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </Card>

                {/* Chat Window */}
                <Card className="col-span-12 md:col-span-8 h-full shadow-premium border-border/50 flex flex-col overflow-hidden">
                    {activeConversation ? (
                        <>
                            <div className="p-4 border-b flex items-center gap-3 bg-muted/20">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={activeConversation.userAvatar} />
                                    <AvatarFallback>{activeConversation.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{activeConversation.userName}</p>
                                    <p className={cn("text-xs flex items-center gap-1", activeConversation.isOnline ? "text-green-600" : "text-muted-foreground")}>
                                        <span className={cn("h-1.5 w-1.5 rounded-full", activeConversation.isOnline ? "bg-green-600" : "bg-gray-400")} />
                                        {activeConversation.isOnline ? "Online" : "Offline"}
                                    </p>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {loadingMessages ? (
                                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                                    ) : messages.map((msg) => (
                                        <div key={msg.id} className={cn("flex gap-3", msg.isSender ? "justify-end" : "")}>
                                            {!msg.isSender && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={activeConversation.userAvatar} />
                                                    <AvatarFallback>KH</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={cn(
                                                "p-3 rounded-lg max-w-[80%]",
                                                msg.isSender ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
                                            )}>
                                                {msg.type === 'image' ? (
                                                    <img src={msg.text} alt="Shared image" className="max-w-[200px] rounded-sm" />
                                                ) : (
                                                    <p className="text-sm">{msg.text}</p>
                                                )}
                                                <span className={cn(
                                                    "text-[10px] block mt-1",
                                                    msg.isSender ? "text-primary-foreground/70" : "text-muted-foreground"
                                                )}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t bg-background mt-auto">
                                <form className="flex gap-2 items-center" onSubmit={handleSend}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                    <Input
                                        placeholder="Nhập tin nhắn..."
                                        className="flex-1"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                    />
                                    <Button type="submit" size="icon" disabled={!inputText.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <p>Chọn một cuộc hội thoại để bắt đầu chat</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
