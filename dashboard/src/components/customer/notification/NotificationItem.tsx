import { type Notification } from "@/store/notificationStore";
import { cn } from "@/lib/utils";
import { ShoppingBag, Tag, Wallet, Bell, MessageSquare, Package } from "lucide-react";
import { Link } from "react-router-dom";

interface NotificationItemProps {
    notification: Notification;
    onClick?: () => void;
}

// Format relative time in Vietnamese
function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    let d: Date;
    
    if (date instanceof Date) {
        d = date;
    } else {
        // If string doesn't have timezone, assume UTC
        const ts = date.endsWith('Z') || date.includes('+') || (date.length > 10 && date.includes('-', 10))
            ? date 
            : date + 'Z';
        d = new Date(ts);
    }
    
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 0) return 'Vừa xong'; // Future time (clock skew)
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString('vi-VN');
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const type = notification.type?.toLowerCase() || '';
    
    const getIcon = () => {
        if (type.includes('order')) return <Package className="h-4 w-4 text-white" />;
        if (type.includes('promo') || type.includes('voucher') || type.includes('sale')) return <Tag className="h-4 w-4 text-white" />;
        if (type.includes('wallet') || type.includes('refund') || type.includes('payment')) return <Wallet className="h-4 w-4 text-white" />;
        if (type.includes('chat') || type.includes('message')) return <MessageSquare className="h-4 w-4 text-white" />;
        if (type.includes('shop')) return <ShoppingBag className="h-4 w-4 text-white" />;
        return <Bell className="h-4 w-4 text-white" />;
    };

    const getBgColor = () => {
        if (type.includes('order')) return "bg-orange-500";
        if (type.includes('promo') || type.includes('voucher') || type.includes('sale')) return "bg-pink-500";
        if (type.includes('wallet') || type.includes('refund') || type.includes('payment')) return "bg-green-500";
        if (type.includes('chat') || type.includes('message')) return "bg-blue-500";
        if (type.includes('shop')) return "bg-purple-500";
        return "bg-gray-500";
    };

    return (
        <Link
            to={notification.link || '#'}
            onClick={onClick}
            className={cn(
                "flex gap-3 p-3 hover:bg-gray-50 transition-colors border-b last:border-0",
                !notification.isRead && "bg-orange-50/50"
            )}
        >
            <div className="relative flex-shrink-0">
                {notification.image ? (
                    <img src={notification.image} alt="thumb" className="h-10 w-10 object-cover rounded-sm border" />
                ) : (
                    <div className={cn("h-10 w-10 flex items-center justify-center rounded-full", getBgColor())}>
                        {getIcon()}
                    </div>
                )}
                {!notification.isRead && (
                    <div className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full border border-white"></div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 mb-0.5">{notification.title}</div>
                <div className="text-xs text-gray-600 line-clamp-2 mb-1">
                    {notification.body || notification.description}
                </div>
                <div className="text-[10px] text-gray-400">
                    {formatRelativeTime(notification.createdAt || notification.timestamp || new Date())}
                </div>
            </div>
        </Link>
    );
}
