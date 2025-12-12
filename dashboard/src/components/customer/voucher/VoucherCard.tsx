import { type Voucher } from "@/services/voucher.service";
import { cn, formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { Copy, Store, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoucherCardProps {
    voucher: Voucher;
    isExpired?: boolean;
    onCollect?: () => void;
    isCollecting?: boolean;
    showCollectButton?: boolean;
}

export function VoucherCard({ 
    voucher, 
    isExpired = false, 
    onCollect,
    isCollecting = false,
    showCollectButton = false
}: VoucherCardProps) {
    const copyCode = () => {
        navigator.clipboard.writeText(voucher.code);
        toast.success("Đã sao chép mã voucher!");
    };

    const getDiscountText = () => {
        if (voucher.discountType === 'percentage') {
            return `${voucher.discountValue}%`;
        }
        return formatCurrency(voucher.discountValue);
    };

    const getMaxDiscountText = () => {
        if (voucher.discountType === 'percentage' && voucher.maxDiscount) {
            return `Tối đa ${formatCurrency(voucher.maxDiscount)}`;
        }
        return null;
    };

    return (
        <div className={cn(
            "relative flex bg-white border border-l-0 rounded-r-md shadow-sm overflow-hidden",
            "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[radial-gradient(circle_at_left,_transparent_4px,_#e5e7eb_4px)] before:bg-[length:8px_8px]",
            isExpired && "opacity-60 grayscale"
        )}>
            {/* Left Ticket Stub */}
            <div className={cn(
                "w-24 flex flex-col items-center justify-center text-white p-2 shrink-0 border-r border-dashed border-white relative",
                voucher.type === 'platform' ? "bg-shopee-orange" : "bg-blue-500"
            )}>
                <div className="absolute -left-1.5 top-1/2 -mt-1.5 h-3 w-3 bg-gray-50 rounded-full"></div>

                <div className="font-bold text-xl">{getDiscountText()}</div>
                <div className="text-[10px] uppercase font-medium">GIẢM</div>
                {voucher.type === 'platform' ? (
                    <Globe className="h-4 w-4 mt-1 opacity-70" />
                ) : (
                    <Store className="h-4 w-4 mt-1 opacity-70" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        <div className="font-medium text-sm text-gray-900 line-clamp-1">
                            {voucher.discountType === 'percentage' 
                                ? `Giảm ${voucher.discountValue}%` 
                                : `Giảm ${formatCurrency(voucher.discountValue)}`}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-shopee-orange" onClick={copyCode}>
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                        <div>Đơn tối thiểu {formatCurrency(voucher.minOrderValue)}</div>
                        {getMaxDiscountText() && <div>{getMaxDiscountText()}</div>}
                    </div>
                </div>

                <div className="flex justify-between items-end mt-2">
                    <div className="text-[10px] text-gray-400">
                        HSD: {dayjs(voucher.endDate).format('DD/MM/YYYY')}
                    </div>
                    {showCollectButton && !voucher.isCollected && !isExpired && (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs border-shopee-orange text-shopee-orange hover:bg-orange-50"
                            onClick={onCollect}
                            disabled={isCollecting}
                        >
                            {isCollecting ? "Đang lưu..." : "Lưu"}
                        </Button>
                    )}
                    {showCollectButton && voucher.isCollected && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            Đã lưu
                        </span>
                    )}
                    {!showCollectButton && !isExpired && (
                        <span className="text-xs text-shopee-orange font-medium">
                            {voucher.code}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
