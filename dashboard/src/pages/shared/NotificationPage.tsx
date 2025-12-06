import { useEffect } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, CheckCircle, AlertTriangle, XCircle, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function NotificationPage() {
    const { notifications, fetchNotifications, markAllAsRead, markAsRead } = useNotificationStore();

    useEffect(() => {
        fetchNotifications();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
                    <p className="text-muted-foreground mt-1">Stay updated with important events</p>
                </div>
                <Button onClick={() => markAllAsRead()} variant="outline">
                    <Check className="mr-2 h-4 w-4" /> Mark all as read
                </Button>
            </div>

            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-20 bg-muted/30 rounded-lg">
                        <p className="text-muted-foreground">No notifications found.</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <Card
                            key={notification._id}
                            className={cn(
                                "transition-all duration-200 hover:shadow-md cursor-pointer border-l-4",
                                notification.isRead ? "border-l-transparent opacity-80" : "border-l-primary shadow-sm bg-primary/5"
                            )}
                            onClick={() => !notification.isRead && markAsRead(notification._id)}
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
                                                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">New</Badge>
                                            )}
                                        </h3>
                                        <span className="text-xs text-muted-foreground flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground">
                                        {notification.message}
                                    </p>
                                    {notification.link && (
                                        <Button variant="link" className="px-0 h-auto text-primary" asChild>
                                            <a href={notification.link}>View Details</a>
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
