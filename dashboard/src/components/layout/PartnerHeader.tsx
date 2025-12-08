import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { HelpCircle } from "lucide-react";
import { NotificationDropdown } from "@/components/common/NotificationDropdown";
import { ModeToggle } from "@/components/mode-toggle";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { useAuthStore } from "@/store/authStore";

export function PartnerHeader() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };
    return (
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-border/40 fixed top-0 right-0 left-64 z-40 flex items-center justify-between px-6 shadow-sm transition-all duration-300">
            <div className="flex items-center">
                <Breadcrumbs />
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm hover:text-primary transition-colors cursor-pointer bg-muted/50 px-3 py-1.5 rounded-full">
                    <HelpCircle className="h-4 w-4" />
                    <span>Trung tâm hỗ trợ</span>
                </div>

                <div className="h-6 w-px bg-border mx-1" />

                <ModeToggle />

                <div className="h-6 w-px bg-border mx-1" />

                <NotificationDropdown />

                <div className="h-6 w-px bg-border mx-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none">
                        <div className="flex items-center gap-3 cursor-pointer p-1 hover:bg-muted rounded-full pr-3 transition-colors">
                            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                <AvatarImage src={user?.avatarUrl || "https://github.com/shadcn.png"} />
                                <AvatarFallback>{user?.fullName?.charAt(0) || "P"}</AvatarFallback>
                            </Avatar>
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-foreground leading-none">{user?.fullName || "Partner"}</p>
                                <p className="text-xs text-primary font-medium mt-0.5">{user?.status === 'active' ? 'Đang hoạt động' : user?.status}</p>
                            </div>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 shadow-premium border-border/40">
                        <DropdownMenuLabel>Tài khoản shop</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/partner/profile")}>Hồ sơ Shop</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/partner/settings")}>Thiết lập Shop</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={handleLogout}>
                            Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
