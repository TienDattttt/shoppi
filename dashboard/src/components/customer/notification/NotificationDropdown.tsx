import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationStore } from "@/store/notificationStore";
import { NotificationItem } from "./NotificationItem";
import { Link } from "react-router-dom";

export function NotificationDropdown() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();

    // Show only top 5 recent notifications
    const recentNotifications = notifications.slice(0, 5);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative cursor-pointer hover:opacity-80">
                    <Bell className="h-6 w-6 text-white" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-white text-shopee-orange text-xs font-bold rounded-full flex items-center justify-center border border-shopee-orange">
                            {unreadCount}
                        </span>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-3 border-b">
                    <div className="font-medium text-gray-700">Notifications ({unreadCount})</div>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-shopee-orange hover:underline"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    {recentNotifications.length > 0 ? (
                        recentNotifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onClick={() => markAsRead(notification.id)}
                            />
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No notifications yet
                        </div>
                    )}
                </div>

                <Link
                    to="/user/notifications"
                    className="block w-full p-2 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-shopee-orange border-t"
                >
                    View All
                </Link>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
