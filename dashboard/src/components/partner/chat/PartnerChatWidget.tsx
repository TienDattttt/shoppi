import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { PartnerChatWindow } from "./PartnerChatWindow";

export function PartnerChatWidget() {
    const { toggleChat, isOpen, conversations, loadConversations, setCurrentUserId } = useChatStore();
    const { user } = useAuthStore();
    const unreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

    // Load conversations on mount
    useEffect(() => {
        if (user?.id) {
            console.log('[PartnerChatWidget] Loading conversations for user:', user.id);
            setCurrentUserId(user.id);
            loadConversations();
        }
    }, [user?.id]);

    return (
        <>
            <PartnerChatWindow />

            {!isOpen && (
                <div className="fixed bottom-4 right-4 z-40">
                    <Button
                        onClick={toggleChat}
                        className="h-14 w-auto px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center gap-2 text-lg font-medium relative"
                    >
                        <MessageCircle className="h-6 w-6" />
                        Chat
                        {unreadCount > 0 && (
                            <span className="bg-white text-blue-600 text-xs h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center font-bold absolute -top-1 -right-1 border border-blue-600">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Button>
                </div>
            )}
        </>
    );
}
