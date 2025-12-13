import { useEffect } from "react";
import { Bell, Package, Tag, Wallet, MessageSquare, Info } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationStore } from "@/store/notificationStore";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

// Get icon based on notification type
function getNotificationIcon(type: string) {
    const t = type?.toLowerCase() || '';
    if (t.includes('order')) return <Package className="h-5 w-5 text-orange-500" />;
    if (t.includes('promo') || t.includes('voucher') || t.includes('sale')) return <Tag className="h-5 w-5 text-red-500" />;
    if (t.includes('wallet') || t.includes('refund') || t.includes('payment')) return <Wallet className="h-5 w-5 text-green-500" />;
    if (t.includes('chat') || t.includes('message')) return <MessageSquare className="h-5 w-5 text-blue-500" />;
    return <Info className="h-5 w-5 text-gray-500" />;
}

export function NotificationDropdown() {
    const navigate = useNavigate();
    const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();

    // Fetch notifications on mount and poll every 30 seconds
    useEffect(() => {
        fetchNotifications();
        
        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    // Show only top 5 recent notifications
    const recentNotifications = notifications.slice(0, 5);

    const handleNotificationClick = async (notification: any) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative cursor-pointer hover:opacity-80">
                    <Bell className="h-6 w-6 text-white" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-white text-shopee-orange text-xs font-bold rounded-full flex items-center justify-center border border-shopee-orange">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-3 border-b">
                    <div className="font-medium text-gray-700">
                        Thông báo {unreadCount > 0 && `(${unreadCount})`}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-shopee-orange hover:underline"
                        >
                            Đánh dấu đã đọc
                        </button>
                    )}
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            Đang tải...
                        </div>
                    ) : recentNotifications.length > 0 ? (
                        recentNotifications.map(notification => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={cn(
                                    "flex gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0",
                                    !notification.isRead && "bg-orange-50"
                                )}
                            >
                                <div className="shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    {notification.image ? (
                                        <img src={notification.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                                    ) : (
                                        getNotificationIcon(notification.type)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={cn(
                                            "text-sm font-medium line-clamp-1",
                                            !notification.isRead && "text-shopee-orange"
                                        )}>
                                            {notification.title}
                                        </p>
                                        {!notification.isRead && (
                                            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                        {notification.body || notification.description}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatRelativeTime(notification.createdAt)}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            Chưa có thông báo nào
                        </div>
                    )}
                </div>

                <Link
                    to="/user/notifications"
                    className="block w-full p-2 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-shopee-orange border-t"
                >
                    Xem tất cả
                </Link>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
