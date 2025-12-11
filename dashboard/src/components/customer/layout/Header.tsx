import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, User, LogOut, Settings, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { LoginModal } from "../auth/LoginModal";
import { RegisterModal } from "../auth/RegisterModal";
import { ForgotPasswordModal } from "../auth/ForgotPasswordModal";
import { NotificationDropdown } from "../notification/NotificationDropdown";
import { SearchBar } from "./SearchBar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
    const navigate = useNavigate();

    // Auth State
    const { user, logout } = useAuthStore();
    const isAuthenticated = !!user;

    // Modal State
    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [showForgot, setShowForgot] = useState(false);

    // Mock store values for now
    const cartItemCount = 2;

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
            <div className="container flex h-16 items-center">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                        <nav className="flex flex-col gap-4">
                            <Link to="/" className="font-semibold">Home</Link>
                            <Link to="/products" className="font-semibold">Products</Link>
                            <Link to="/shops" className="font-semibold">Shops</Link>
                        </nav>
                    </SheetContent>
                </Sheet>

                <div className="mr-4 hidden md:flex">
                    <Link to="/" className="mr-6 flex items-center space-x-2">
                        <span className="hidden font-bold sm:inline-block text-shopee-orange text-xl">
                            Shoppi
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground/60">
                            Home
                        </Link>
                        <Link to="/products" className="transition-colors hover:text-foreground/80 text-foreground/60">
                            Products
                        </Link>
                    </nav>
                </div>

                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        <SearchBar className="sm:w-[300px] md:w-[200px] lg:w-[300px]" />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Cart */}
                        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/cart')}>
                            <ShoppingCart className="h-5 w-5" />
                            {cartItemCount > 0 && (
                                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                    {cartItemCount}
                                </Badge>
                            )}
                        </Button>

                        {/* Notifications */}
                        {isAuthenticated && <NotificationDropdown />}

                        {/* User Menu */}
                        {isAuthenticated ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.avatar || "https://github.com/shadcn.png"} />
                                            <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate('/user/profile')}>
                                        <User className="mr-2 h-4 w-4" /> Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/user/purchase')}>
                                        <Package className="mr-2 h-4 w-4" /> My Orders
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/user/account/password')}>
                                        <Settings className="mr-2 h-4 w-4" /> Change Password
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => logout()}>
                                        <LogOut className="mr-2 h-4 w-4" /> Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Button variant="ghost" onClick={() => setShowLogin(true)}>Login</Button>
                                <Button onClick={() => setShowRegister(true)}>Register</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Auth Modals */}
            <LoginModal
                open={showLogin}
                onOpenChange={setShowLogin}
                onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }}
                onSwitchToForgot={() => { setShowLogin(false); setShowForgot(true); }}
            />
            <RegisterModal
                open={showRegister}
                onOpenChange={setShowRegister}
                onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }}
            />
            <ForgotPasswordModal
                open={showForgot}
                onOpenChange={setShowForgot}
                onSwitchToLogin={() => { setShowForgot(false); setShowLogin(true); }}
            />
        </header>
    );
}
