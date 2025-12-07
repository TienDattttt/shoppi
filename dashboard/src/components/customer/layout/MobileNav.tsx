import { Link, useLocation } from "react-router-dom";
import { Home, Grid, ShoppingBag, User, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

export function MobileNav() {
    const location = useLocation();
    const { user } = useAuthStore();

    // Determine the active tab based on current path
    const isActive = (path: string) => {
        if (path === "/" && location.pathname === "/") return true;
        if (path !== "/" && location.pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        { label: "Home", icon: Home, path: "/" },
        { label: "Categories", icon: Grid, path: "/categories" },
        { label: "Mall", icon: ShoppingBag, path: "/mall" }, // Placeholder for Mall/Shops
        { label: "Wishlist", icon: Heart, path: "/wishlist" },
        { label: "Me", icon: User, path: user ? "/account/profile" : "/login" },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around z-50 pb-safe">
            {navItems.map((item) => (
                <Link
                    key={item.label}
                    to={item.path}
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full gap-0.5 text-[10px] font-medium transition-colors",
                        isActive(item.path)
                            ? "text-shopee-orange"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                </Link>
            ))}
        </div>
    );
}
