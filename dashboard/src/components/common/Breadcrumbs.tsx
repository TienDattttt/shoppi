import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUTE_NAME_MAP: Record<string, string> = {
    "admin": "Dashboard",
    "users": "User Management",
    "shops": "Shop Management",
    "categories": "Category Management",
    "products": "Product Management",
    "orders": "Order Management",
    "vouchers": "Voucher Management",
    "shippers": "Shipper Management",
    "reports": "Reports",
    "settings": "Settings",
    "partner": "Partner Dashboard",
    "profile": "Shop Profile",
    "reviews": "Reviews",
    "chat": "Chat",
    "add": "Add New",
    "approval": "Product Approval",
    "notifications": "Notifications"
};

export function Breadcrumbs() {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);

    return (
        <nav className="flex items-center text-sm text-muted-foreground mb-4 sm:mb-0">
            <Link to="/" className="flex items-center hover:text-primary transition-colors">
                <Home className="h-4 w-4 mr-1" />
            </Link>
            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                const isLast = index === pathnames.length - 1;
                const name = ROUTE_NAME_MAP[value] || value; // Fallback to raw path ID if not mapped

                // Check if it looks like an ID (long string with numbers)
                const displayName = (value.length > 20 || value.startsWith('ord_') || value.startsWith('p_') || value.startsWith('s_') || value.startsWith('u_'))
                    ? (value.length > 10 ? `#${value.substring(0, 8)}...` : `#${value}`)
                    : (name.charAt(0).toUpperCase() + name.slice(1));

                return (
                    <div key={to} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
                        {isLast ? (
                            <span className={cn("font-medium text-foreground", "pointer-events-none")}>
                                {displayName}
                            </span>
                        ) : (
                            <Link to={to} className="hover:text-primary transition-colors">
                                {displayName}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
