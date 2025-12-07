import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { ChatWidget } from "../chat/ChatWidget";
import { Footer } from "./Footer";
import { Toaster } from "sonner";

export default function CustomerLayout() {
    return (
        <div className="min-h-screen flex flex-col relative">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <MobileNav />
            <ChatWidget />
            <Toaster position="top-center" richColors />
        </div>
    );
}
