import { PartnerHeader } from "./PartnerHeader";
import { PartnerSidebar } from "./PartnerSidebar";
import { PartnerChatWidget } from "@/components/partner/chat/PartnerChatWidget";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {

    return (
        <div className="min-h-screen bg-shopee-gray flex">
            <PartnerSidebar />
            <div className="flex-1 flex flex-col pl-64 transition-all duration-300">
                <PartnerHeader />
                <main className="flex-1 mt-16 p-6">
                    {children}
                </main>
            </div>
            <PartnerChatWidget />
        </div>
    );
}
