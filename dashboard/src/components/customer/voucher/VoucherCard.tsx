import { type Voucher } from "@/store/cartStore";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoucherCardProps {
    voucher: Voucher;
    compact?: boolean;
}

export function VoucherCard({ voucher, compact = false }: VoucherCardProps) {
    const isExpired = voucher.isExpired;

    const copyCode = () => {
        navigator.clipboard.writeText(voucher.code);
        toast.success("Voucher code copied to clipboard!");
    };

    return (
        <div className={cn(
            "relative flex bg-white border border-l-0 rounded-r-md shadow-sm overflow-hidden",
            "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[radial-gradient(circle_at_left,_transparent_4px,_#e5e7eb_4px)] before:bg-[length:8px_8px]",
            isExpired && "opacity-60 grayscale"
        )}>
            {/* Left Ticket Stub Style via SVG or Border magic - simplified here */}
            <div className="bg-shopee-orange w-24 flex flex-col items-center justify-center text-white p-2 shrink-0 border-r border-dashed border-white relative">
                <div className="absolute -left-1.5 top-1/2 -mt-1.5 h-3 w-3 bg-gray-50 rounded-full"></div>

                <div className="font-bold text-xl">{voucher.type === 'percent' ? `${voucher.value}%` : '₫' + (voucher.value / 1000) + 'k'}</div>
                <div className="text-[10px] uppercase font-medium">OFF</div>
            </div>

            {/* Content */}
            <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        <div className="font-medium text-sm text-gray-900 line-clamp-1">
                            {voucher.code} - {voucher.type === 'percent' ? `Discount ${voucher.value}%` : `Discount ₫${voucher.value.toLocaleString()}`}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-shopee-orange" onClick={copyCode}>
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Min spend ₫{voucher.minSpend.toLocaleString()}
                    </div>
                </div>

                <div className="flex justify-between items-end mt-2">
                    <div className="text-[10px] text-gray-400">
                        Exp: {dayjs(voucher.expiryDate).format('DD/MM/YYYY')}
                    </div>
                    {!isExpired && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-shopee-orange text-shopee-orange hover:bg-orange-50">
                            Use Now
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
