import { useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { useNotificationStore } from "@/store/notificationStore";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Notification } from "@/services/notification.service";

export function NotificationDropdown() {
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchNotifications();
        // In a real app, you might set up a socket listener here for real-time updates
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            markAsRead(notification._id || notification.id);
        }
        setIsOpen(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const displayNotifications = notifications.slice(0, 5); // Show latest 5

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
                    <h4 className="font-semibold leading-none">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => markAllAsRead()}
                        >
                            <Check className="mr-1 h-3 w-3" /> Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {displayNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm p-4 text-center">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div className="py-1">
                            {displayNotifications.map((notification: any) => (
                                <DropdownMenuItem
                                    key={notification._id || notification.id}
                                    className={cn(
                                        "flex items-start gap-3 p-3 cursor-pointer focus:bg-muted/50",
                                        !notification.isRead && "bg-muted/30"
                                    )}
                                    // If there is a link, wrap content or handleClick handles navigation if using useNavigate. 
                                    // For simplicity, we just use onClick for logic and Link wrapper if needed, 
                                    // but DropdownMenuItem acts as a button.
                                    asChild
                                >
                                    {notification.link ? (
                                        <Link
                                            to={notification.link}
                                            onClick={() => handleNotificationClick(notification)}
                                            className="block w-full"
                                        >
                                            <div className="flex items-start gap-3 w-full">
                                                <div className="mt-1 shrink-0">
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="space-y-1 w-full">
                                                    <div className="flex justify-between items-center w-full gap-2">
                                                        <p className={cn("text-sm font-medium leading-none", !notification.isRead && "text-primary")}>
                                                            {notification.title}
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                                                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                                {!notification.isRead && (
                                                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                        </Link>
                                    ) : (
                                        <div onClick={(e) => { e.preventDefault(); handleNotificationClick(notification); }}>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 shrink-0">
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center w-full gap-2">
                                                        <p className={cn("text-sm font-medium leading-none", !notification.isRead && "text-primary")}>
                                                            {notification.title}
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <DropdownMenuSeparator />
                <div className="p-2">
                    {/* Role based link would be better but simple relative path works if structure is consistent or pass prop */}
                    <Link to={window.location.pathname.startsWith('/admin') ? '/admin/notifications' : '/partner/notifications'}>
                        <Button variant="ghost" className="w-full text-xs h-8">View all notifications</Button>
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
