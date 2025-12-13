import { useState, useEffect } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { NotificationItem } from "@/components/customer/notification/NotificationItem";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck, Bell } from "lucide-react";

const FILTER_LABELS: Record<string, string> = {
    ALL: 'Tất cả',
    ORDER: 'Đơn hàng',
    PROMOTION: 'Khuyến mãi',
    WALLET: 'Ví tiền',
    SYSTEM: 'Hệ thống',
};

export default function NotificationsPage() {
    const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        fetchNotifications();
    }, []);

    const filteredNotifications = notifications.filter(n => {
        if (filter === "ALL") return true;
        return n.type?.toUpperCase() === filter;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="bg-white rounded-sm shadow-sm min-h-[500px]">
            <div className="flex justify-between items-center p-4 border-b">
                <h1 className="text-xl font-medium">
                    Thông báo của tôi
                    {unreadCount > 0 && (
                        <span className="ml-2 text-sm text-gray-500">({unreadCount} chưa đọc)</span>
                    )}
                </h1>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-shopee-orange"
                        onClick={() => markAllAsRead()}
                    >
                        <CheckCheck className="mr-2 h-4 w-4" /> Đánh dấu đã đọc tất cả
                    </Button>
                )}
            </div>

            <div className="sticky top-0 bg-white z-10 p-2 border-b">
                <Tabs defaultValue="ALL" onValueChange={setFilter}>
                    <TabsList className="bg-transparent justify-start h-auto p-0 flex-wrap">
                        {Object.entries(FILTER_LABELS).map(([type, label]) => (
                            <TabsTrigger
                                key={type}
                                value={type}
                                className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-4 py-2"
                            >
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            <div>
                {loading && notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Bell className="h-12 w-12 mb-4 animate-pulse" />
                        <p>Đang tải...</p>
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notification => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onClick={() => !notification.isRead && markAsRead(notification.id)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">🔕</span>
                        </div>
                        <p>Chưa có thông báo nào</p>
                    </div>
                )}
            </div>
        </div>
    );
}
