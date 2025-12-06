import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    // Basic auth check mock

    return (
        <div className="min-h-screen bg-shopee-gray flex">
            <AdminSidebar />
            <div className="flex-1 flex flex-col pl-64 transition-all duration-300">
                <AdminHeader />
                <main className="flex-1 mt-16 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
