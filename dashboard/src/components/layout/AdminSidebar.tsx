
import {
    CheckSquare,
    ClipboardList,
    Truck,
    BarChart3,
    LayoutDashboard,
    Users,
    ShoppingBag,
    Layers,
    Ticket,
    Settings,
    LogOut
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const sidebarItems = [
    { title: "Tổng quan", icon: LayoutDashboard, href: "/admin" },
    { title: "Người dùng", icon: Users, href: "/admin/users" },
    { title: "Cửa hàng", icon: ShoppingBag, href: "/admin/shops" },
    { title: "Duyệt sản phẩm", icon: CheckSquare, href: "/admin/products/approval" },
    { title: "Danh mục", icon: Layers, href: "/admin/categories" },
    { title: "Đơn hàng", icon: ClipboardList, href: "/admin/orders" },
    { title: "Vouchers", icon: Ticket, href: "/admin/vouchers" },
    { title: "Shipper", icon: Truck, href: "/admin/shippers" },
    { title: "Báo cáo", icon: BarChart3, href: "/admin/reports" },
    { title: "Cài đặt", icon: Settings, href: "/admin/settings" },
];

export function AdminSidebar() {
    const location = useLocation();

    return (
        <div className="w-64 bg-card h-screen fixed left-0 top-0 border-r border-border/50 z-50 flex flex-col shadow-premium">
            <div className="h-16 flex items-center justify-center border-b border-border/50 gap-2">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center shadow-lg">
                    <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                    Admin
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
                                        ? "bg-blue-50 text-blue-600 shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 transition-colors",
                                        isActive ? "text-blue-600" : "text-muted-foreground"
                                    )}
                                />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-border/50">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="mr-3 h-5 w-5" />
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
}
