import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { User, MapPin, Lock, FileText, Bell, Ticket, Store, MessageSquare, Heart, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";

export default function AccountLayout() {
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

    const menuItems = [
        { icon: User, label: "Hồ sơ của tôi", href: "/user/profile" },
        { icon: MapPin, label: "Địa chỉ", href: "/user/account/address" },
        { icon: Lock, label: "Đổi mật khẩu", href: "/user/account/password" },
        { icon: FileText, label: "Đơn mua", href: "/user/purchase" },
        { icon: RotateCcw, label: "Trả hàng/Hoàn tiền", href: "/user/returns" },
        { icon: Heart, label: "Sản phẩm yêu thích", href: "/user/wishlist" },
        { icon: MessageSquare, label: "Tin nhắn", href: "/user/chat", badge: unreadCount },
        { icon: Store, label: "Shop đang theo dõi", href: "/user/following" },
        { icon: Bell, label: "Thông báo", href: "/user/notifications" },
        { icon: Ticket, label: "Kho voucher", href: "/user/voucher-wallet" },
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-12">
            <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="flex items-center gap-4 mb-6 px-2">
                        <img
                            src={user?.avatarUrl || "https://github.com/shadcn.png"}
                            alt="avatar"
                            className="h-12 w-12 rounded-full border border-gray-200"
                        />
                        <div className="overflow-hidden">
                            <div className="font-medium truncate">{user?.fullName}</div>
                            <Link to="/user/profile" className="text-xs text-gray-500 hover:text-shopee-orange flex items-center gap-1">
                                <User className="h-3 w-3" /> Sửa hồ sơ
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white rounded-sm shadow-sm overflow-hidden py-2">
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-6 py-3 text-sm hover:text-shopee-orange transition-colors",
                                    location.pathname === item.href ? "text-shopee-orange font-medium" : "text-gray-700"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className={cn(
                    "flex-1 bg-white rounded-sm shadow-sm",
                    location.pathname === "/user/chat" ? "p-0 overflow-hidden" : "p-6 min-h-[500px]"
                )}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
