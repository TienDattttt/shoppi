import { cn } from "@/lib/utils";
import { type Message } from "@/store/chatStore";
import dayjs from "dayjs";

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    return (
        <div className={cn("flex w-full mb-3", isOwn ? "justify-end" : "justify-start")}>
            <div className={cn(
                "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                isOwn ? "bg-shopee-orange text-white rounded-br-none" : "bg-white border rounded-bl-none text-gray-800 shadow-sm"
            )}>
                <div>{message.text}</div>
                <div className={cn("text-[10px] mt-1 text-right", isOwn ? "text-orange-100" : "text-gray-400")}>
                    {dayjs(message.timestamp).format('HH:mm')}
                </div>
            </div>
        </div>
    );
}
