import { useEffect } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Package, Tag, Wallet, MessageSquare, Info, Clock, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

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

export default function NotificationPage() {
    const navigate = useNavigate();
    const { notifications, loading, fetchNotifications, markAllAsRead, markAsRead } = useNotificationStore();

    useEffect(() => {
        fetchNotifications();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const getIcon = (type: string) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('order')) return <Package className="h-5 w-5 text-orange-500" />;
        if (t.includes('promo') || t.includes('voucher') || t.includes('sale')) return <Tag className="h-5 w-5 text-red-500" />;
        if (t.includes('wallet') || t.includes('refund') || t.includes('payment')) return <Wallet className="h-5 w-5 text-green-500" />;
        if (t.includes('chat') || t.includes('message')) return <MessageSquare className="h-5 w-5 text-blue-500" />;
        return <Info className="h-5 w-5 text-primary" />;
    };

    const handleNotificationClick = async (notification: any) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Thông báo</h1>
                    <p className="text-muted-foreground mt-1">
                        {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Cập nhật các sự kiện quan trọng'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button onClick={() => markAllAsRead()} variant="outline">
                        <Check className="mr-2 h-4 w-4" /> Đánh dấu đã đọc tất cả
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {loading && notifications.length === 0 ? (
                    <div className="text-center py-20 bg-muted/30 rounded-lg">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                        <p className="text-muted-foreground">Đang tải...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-20 bg-muted/30 rounded-lg">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Chưa có thông báo nào</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={cn(
                                "transition-all duration-200 hover:shadow-md cursor-pointer border-l-4",
                                notification.isRead ? "border-l-transparent opacity-80" : "border-l-primary shadow-sm bg-primary/5"
                            )}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <CardContent className="p-4 flex gap-4 items-start">
                                <div className="mt-1 p-2 bg-background rounded-full shadow-sm">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className={cn("font-semibold text-lg", !notification.isRead && "text-primary")}>
                                            {notification.title}
                                            {!notification.isRead && (
                                                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">Mới</Badge>
                                            )}
                                        </h3>
                                        <span className="text-xs text-muted-foreground flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {formatRelativeTime(notification.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground">
                                        {notification.body || notification.description}
                                    </p>
                                    {notification.link && (
                                        <Button variant="link" className="px-0 h-auto text-primary">
                                            Xem chi tiết
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
