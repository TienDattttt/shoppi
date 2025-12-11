import { Link, Outlet, useLocation } from "react-router-dom";
import { User, MapPin, Lock, FileText, Bell, Ticket, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

export default function AccountLayout() {
    const location = useLocation();
    const { user } = useAuthStore();

    const menuItems = [
        { icon: User, label: "Hồ sơ của tôi", href: "/user/profile" },
        { icon: MapPin, label: "Địa chỉ", href: "/user/account/address" },
        { icon: Lock, label: "Đổi mật khẩu", href: "/user/account/password" },
        { icon: FileText, label: "Đơn mua", href: "/user/purchase" },
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
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white rounded-sm shadow-sm p-6 min-h-[500px]">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
