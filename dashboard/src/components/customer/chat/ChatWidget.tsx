import { MessageCircle } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./ChatWindow";

export function ChatWidget() {
    const { toggleChat, isOpen, conversations } = useChatStore();
    const unreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

    return (
        <>
            <ChatWindow />

            {!isOpen && (
                <div className="fixed bottom-4 right-4 z-40">
                    <Button
                        onClick={toggleChat}
                        className="h-14 w-auto px-6 rounded-full bg-shopee-orange hover:bg-shopee-orange-hover text-white shadow-lg flex items-center gap-2 text-lg font-medium"
                    >
                        <MessageCircle className="h-6 w-6" />
                        Chat
                        {unreadCount > 0 && (
                            <span className="bg-white text-shopee-orange text-xs h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center font-bold absolute -top-1 -right-1 border border-shopee-orange">
                                {unreadCount}
                            </span>
                        )}
                    </Button>
                </div>
            )}
        </>
    );
}
