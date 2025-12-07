import { Loader2 } from "lucide-react";

export default function LoadingFallback() {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-shopee-orange" />
                <div className="text-shopee-orange font-medium animate-pulse">Loading Shoppi...</div>
            </div>
        </div>
    );
}
