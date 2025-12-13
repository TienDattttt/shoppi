import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ChatList() {
    const { conversations, activeConversationId, selectConversation } = useChatStore();

    return (
        <div className="flex flex-col h-full bg-white border-r w-1/3 min-w-[200px]">
            {/* Search */}
            <div className="p-3 border-b">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                    <Input className="h-8 pl-7 text-xs bg-gray-50 border-none" placeholder="Search" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => selectConversation(conv.id)}
                        className={cn(
                            "flex gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50",
                            activeConversationId === conv.id && "bg-orange-50 hover:bg-orange-50"
                        )}
                    >
                        <div className="relative">
                            <img 
                                src={conv.recipientAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.recipientName)}&background=random`} 
                                alt="avatar" 
                                className="h-10 w-10 rounded-full border bg-gray-100 object-cover" 
                            />
                            {conv.online && <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white"></div>}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className={cn("font-medium text-sm truncate pr-2", activeConversationId === conv.id ? "text-shopee-orange" : "text-gray-900")}>
                                    {conv.recipientName}
                                </span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">
                                    {dayjs(conv.lastMessageTime).format('HH:mm')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={cn("text-xs truncate max-w-[120px]", conv.unreadCount > 0 ? "font-medium text-gray-800" : "text-gray-500")}>
                                    {conv.lastMessage}
                                </span>
                                {conv.unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center">
                                        {conv.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
