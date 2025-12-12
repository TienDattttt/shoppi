import { useState, useEffect } from "react";
import { voucherService, type Voucher } from "@/services/voucher.service";
import { VoucherCard } from "@/components/customer/voucher/VoucherCard";
import { Loader2, Ticket, Gift } from "lucide-react";
import { toast } from "sonner";

export default function VoucherHuntPage() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [collectingId, setCollectingId] = useState<string | null>(null);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const data = await voucherService.getPlatformVouchers();
            setVouchers(data);
        } catch (error) {
            console.error("Error fetching vouchers:", error);
            toast.error("Không thể tải danh sách voucher");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const handleCollect = async (voucher: Voucher) => {
        try {
            setCollectingId(voucher.id);
            await voucherService.collectVoucher(voucher.code);
            toast.success("Lưu voucher thành công!");
            // Update local state
            setVouchers(prev => prev.map(v => 
                v.id === voucher.id ? { ...v, isCollected: true } : v
            ));
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể lưu voucher");
        } finally {
            setCollectingId(null);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-shopee-orange to-orange-400 text-white py-8">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-4 rounded-full">
                            <Gift className="h-10 w-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Săn Voucher</h1>
                            <p className="text-white/80 mt-1">Lưu ngay voucher giảm giá hấp dẫn từ Shoppi</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
                    </div>
                ) : vouchers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Ticket className="h-10 w-10 text-gray-300" />
                        </div>
                        <p>Chưa có voucher nào</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vouchers.map(voucher => (
                            <VoucherCard 
                                key={voucher.id} 
                                voucher={voucher}
                                showCollectButton
                                onCollect={() => handleCollect(voucher)}
                                isCollecting={collectingId === voucher.id}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
