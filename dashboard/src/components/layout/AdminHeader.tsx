
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "@/components/common/NotificationDropdown";
import { ModeToggle } from "@/components/mode-toggle";

export function AdminHeader() {
    return (
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-border/40 fixed top-0 right-0 left-64 z-40 flex items-center justify-between px-6 shadow-sm z-[40]">
            <div className="flex items-center">
                <h2 className="text-xl font-semibold text-foreground tracking-tight">Dashboard Overview</h2>
            </div>

            <div className="flex items-center gap-4">
                <NotificationDropdown />

                <div className="h-6 w-px bg-border mx-1" />

                <ModeToggle />

                <div className="h-6 w-px bg-border mx-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none">
                        <div className="flex items-center gap-3 cursor-pointer p-1 hover:bg-muted rounded-full pr-3 transition-colors">
                            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>AD</AvatarFallback>
                            </Avatar>
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-foreground">Admin User</p>
                                <p className="text-xs text-blue-600 font-medium">Super Admin</p>
                            </div>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 shadow-premium border-border/40">
                        <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">Hồ sơ</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">Cài đặt</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive cursor-pointer">Đăng xuất</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
