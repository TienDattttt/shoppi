import { useEffect } from "react";
import {
    LayoutDashboard,
    Package2,
    ShoppingCart,
    MessageSquare,
    User,
    LogOut,
    Store,
    Star,
    Ticket,
    Settings,
    Users,
    Warehouse
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";

const baseSidebarItems = [
    { title: "Kênh Người Bán", icon: LayoutDashboard, href: "/partner" },
    { title: "Quản Lý Đơn Hàng", icon: ShoppingCart, href: "/partner/orders" },
    { title: "Quản Lý Sản Phẩm", icon: Package2, href: "/partner/products" },
    { title: "Quản Lý Tồn Kho", icon: Warehouse, href: "/partner/inventory" },
    { title: "Mã Giảm Giá", icon: Ticket, href: "/partner/vouchers" },
    { title: "Đánh Giá", icon: Star, href: "/partner/reviews" },
    { title: "Người Theo Dõi", icon: Users, href: "/partner/followers" },
    { title: "Tin Nhắn", icon: MessageSquare, href: "/partner/chat", hasBadge: true },
    { title: "Hồ Sơ Shop", icon: User, href: "/partner/profile" },
    { title: "Thiết Lập", icon: Settings, href: "/partner/settings" },
];

export function PartnerSidebar() {
    const location = useLocation();
    const { user } = useAuthStore();
    const { conversations, loadConversations, setCurrentUserId } = useChatStore();
    const unreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

    // Load conversations when user is logged in to show unread badge
    useEffect(() => {
        if (user?.id) {
            setCurrentUserId(user.id);
            loadConversations();
        }
    }, [user?.id]);

    const sidebarItems = baseSidebarItems.map(item => ({
        ...item,
        badge: item.hasBadge ? unreadCount : 0
    }));

    return (
        <div className="w-64 bg-card h-screen fixed left-0 top-0 border-r border-border/50 z-50 flex flex-col shadow-premium">
            <div className="h-16 flex items-center justify-center border-b border-border/50 gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                    <Store className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600">
                    Partner
                </h1>
            </div>

            <div className="flex-1 py-6 overflow-y-auto px-4">
                <nav className="space-y-2">
                    {sidebarItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )}
                                />
                                {item.title}
                                {item.badge > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-border/50">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
}
