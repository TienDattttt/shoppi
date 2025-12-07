import { useState } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { NotificationItem } from "@/components/customer/notification/NotificationItem";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck } from "lucide-react";

export default function NotificationsPage() {
    const { notifications, markAsRead, markAllAsRead } = useNotificationStore();
    const [filter, setFilter] = useState("ALL");

    const filteredNotifications = notifications.filter(n => {
        if (filter === "ALL") return true;
        return n.type === filter;
    });

    return (
        <div className="bg-white rounded-sm shadow-sm min-h-[500px]">
            <div className="flex justify-between items-center p-4 border-b">
                <h1 className="text-xl font-medium">Notifications</h1>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-shopee-orange"
                    onClick={() => markAllAsRead()}
                >
                    <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
                </Button>
            </div>

            <div className="sticky top-0 bg-white z-10 p-2 border-b">
                <Tabs defaultValue="ALL" onValueChange={setFilter}>
                    <TabsList className="bg-transparent justify-start h-auto p-0">
                        {['ALL', 'ORDER', 'PROMOTION', 'WALLET', 'SYSTEM'].map(type => (
                            <TabsTrigger
                                key={type}
                                value={type}
                                className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-4 py-2"
                            >
                                {type === 'ALL' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            <div>
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notification => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onClick={() => markAsRead(notification.id)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">🔕</span>
                        </div>
                        <p>No notifications found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
