import { useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, Check, Package, Tag, Wallet, MessageSquare, Info } from "lucide-react";
import { useNotificationStore } from "@/store/notificationStore";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    if (t.includes('order')) return <Package className="h-4 w-4 text-orange-500" />;
    if (t.includes('promo') || t.includes('voucher') || t.includes('sale')) return <Tag className="h-4 w-4 text-red-500" />;
    if (t.includes('wallet') || t.includes('refund') || t.includes('payment')) return <Wallet className="h-4 w-4 text-green-500" />;
    if (t.includes('chat') || t.includes('message')) return <MessageSquare className="h-4 w-4 text-blue-500" />;
    return <Info className="h-4 w-4 text-primary" />;
}

export function NotificationDropdown() {
    const navigate = useNavigate();
    const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchNotifications();
        
        // Poll for new notifications every 30 seconds
        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const handleNotificationClick = async (notification: any) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }
        setIsOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const displayNotifications = notifications.slice(0, 5);

    // Determine notification page based on current path
    const notificationPagePath = window.location.pathname.startsWith('/partner') 
        ? '/partner/notifications' 
        : window.location.pathname.startsWith('/admin')
        ? '/admin/notifications'
        : '/user/notifications';

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <div className="relative cursor-pointer p-2 hover:bg-muted rounded-full transition-colors group">
                    <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[350px] shadow-premium border-border/40 p-0">
                <div className="flex items-center justify-between p-4 pb-2">
                    <h4 className="font-semibold leading-none">Thông báo</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => markAllAsRead()}
                        >
                            <Check className="mr-1 h-3 w-3" /> Đánh dấu đã đọc
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {loading && notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm p-4 text-center">
                            <Bell className="h-8 w-8 mb-2 opacity-20 animate-pulse" />
                            <p>Đang tải...</p>
                        </div>
                    ) : displayNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm p-4 text-center">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p>Chưa có thông báo nào</p>
                        </div>
                    ) : (
                        <div className="py-1">
                            {displayNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        "flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0",
                                        !notification.isRead && "bg-muted/30"
                                    )}
                                >
                                    <div className="mt-1 shrink-0">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className={cn(
                                                "text-sm font-medium leading-tight line-clamp-1",
                                                !notification.isRead && "text-primary"
                                            )}>
                                                {notification.title}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                                                {formatRelativeTime(notification.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notification.body || notification.description}
                                        </p>
                                    </div>
                                    {!notification.isRead && (
                                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <DropdownMenuSeparator />
                <div className="p-2">
                    <Link to={notificationPagePath}>
                        <Button variant="ghost" className="w-full text-xs h-8">
                            Xem tất cả thông báo
                        </Button>
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
