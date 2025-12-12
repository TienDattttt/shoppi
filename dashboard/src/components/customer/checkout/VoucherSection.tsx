import { useState, useEffect } from "react";
import { Ticket, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { voucherService, type Voucher } from "@/services/voucher.service";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import dayjs from "dayjs";

interface AppliedVoucher {
    code: string;
    discount: number;
    voucherId: string;
}

interface VoucherSectionProps {
    orderTotal: number;
    appliedVoucher: AppliedVoucher | null;
    onApplyVoucher: (voucher: AppliedVoucher | null) => void;
}

export function VoucherSection({ orderTotal, appliedVoucher, onApplyVoucher }: VoucherSectionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputCode, setInputCode] = useState("");
    const [validating, setValidating] = useState(false);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const data = await voucherService.getAvailableVouchers({ orderTotal });
            setVouchers(data);
        } catch (error) {
            console.error("Error fetching vouchers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchVouchers();
        }
    }, [isOpen, orderTotal]);

    const handleApplyCode = async () => {
        if (!inputCode.trim()) return;

        try {
            setValidating(true);
            const result = await voucherService.validateVoucher(inputCode.trim(), orderTotal);
            onApplyVoucher({
                code: result.voucher.code,
                discount: result.discount,
                voucherId: result.voucher.id,
            });
            setIsOpen(false);
            setInputCode("");
            toast.success(`Áp dụng voucher thành công! Giảm ${formatCurrency(result.discount)}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Mã voucher không hợp lệ");
        } finally {
            setValidating(false);
        }
    };

    const handleSelectVoucher = async (voucher: Voucher) => {
        try {
            setValidating(true);
            const result = await voucherService.validateVoucher(voucher.code, orderTotal);
            onApplyVoucher({
                code: result.voucher.code,
                discount: result.discount,
                voucherId: result.voucher.id,
            });
            setIsOpen(false);
            toast.success(`Áp dụng voucher thành công! Giảm ${formatCurrency(result.discount)}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể áp dụng voucher này");
        } finally {
            setValidating(false);
        }
    };

    const handleRemoveVoucher = () => {
        onApplyVoucher(null);
        toast.info("Đã hủy voucher");
    };

    return (
        <>
            <div className="bg-white p-6 rounded-sm shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-shopee-orange">
                        <Ticket className="h-5 w-5" />
                        <span className="font-medium">Voucher Shoppi</span>
                    </div>

                    {appliedVoucher ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded border border-green-200">
                                {appliedVoucher.code} - Giảm {formatCurrency(appliedVoucher.discount)}
                            </span>
                            <button 
                                onClick={handleRemoveVoucher}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsOpen(true)}
                            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
                        >
                            Chọn hoặc nhập mã
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-shopee-orange" />
                            Chọn Voucher
                        </DialogTitle>
                    </DialogHeader>

                    {/* Input Code */}
                    <div className="flex gap-2 mb-4">
                        <Input
                            placeholder="Nhập mã voucher"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCode()}
                        />
                        <Button 
                            onClick={handleApplyCode}
                            disabled={validating || !inputCode.trim()}
                            className="bg-shopee-orange hover:bg-shopee-orange-hover"
                        >
                            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Áp dụng"}
                        </Button>
                    </div>

                    {/* Available Vouchers */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3">Voucher có thể sử dụng</h4>
                        
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-shopee-orange" />
                            </div>
                        ) : vouchers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                Không có voucher nào khả dụng cho đơn hàng này
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {vouchers.map((voucher) => (
                                    <div 
                                        key={voucher.id}
                                        className="border rounded-lg p-3 hover:border-shopee-orange cursor-pointer transition-colors"
                                        onClick={() => handleSelectVoucher(voucher)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-shopee-orange">
                                                    {voucher.discountType === 'percentage' 
                                                        ? `Giảm ${voucher.discountValue}%` 
                                                        : `Giảm ${formatCurrency(voucher.discountValue)}`}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Đơn tối thiểu {formatCurrency(voucher.minOrderValue)}
                                                </div>
                                                {voucher.discountType === 'percentage' && voucher.maxDiscount && (
                                                    <div className="text-xs text-gray-500">
                                                        Giảm tối đa {formatCurrency(voucher.maxDiscount)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400">
                                                    HSD: {dayjs(voucher.endDate).format('DD/MM')}
                                                </div>
                                                {voucher.estimatedDiscount && (
                                                    <div className="text-sm text-green-600 font-medium mt-1">
                                                        -{formatCurrency(voucher.estimatedDiscount)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
