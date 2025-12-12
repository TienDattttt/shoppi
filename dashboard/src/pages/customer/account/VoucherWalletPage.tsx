import { useState, useEffect } from "react";
import { voucherService, type Voucher } from "@/services/voucher.service";
import { VoucherCard } from "@/components/customer/voucher/VoucherCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VoucherWalletPage() {
    const [filter, setFilter] = useState("all");
    const [inputCode, setInputCode] = useState("");
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [collecting, setCollecting] = useState(false);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const data = await voucherService.getMyVouchers({ status: filter as 'active' | 'expired' | 'all' });
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
    }, [filter]);

    const handleCollect = async () => {
        if (!inputCode.trim()) {
            toast.error("Vui lòng nhập mã voucher");
            return;
        }

        try {
            setCollecting(true);
            await voucherService.collectVoucher(inputCode.trim());
            toast.success("Lưu voucher thành công!");
            setInputCode("");
            fetchVouchers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Mã voucher không hợp lệ");
        } finally {
            setCollecting(false);
        }
    };

    const isExpired = (voucher: Voucher) => {
        return !voucher.isActive || new Date(voucher.endDate) < new Date();
    };

    return (
        <div className="bg-white rounded-sm shadow-sm min-h-[500px]">
            <div className="flex justify-between items-center p-4 border-b">
                <h1 className="text-xl font-medium">Ví Voucher</h1>
                <div className="flex gap-2">
                    <Input
                        placeholder="Nhập mã voucher"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        className="w-[200px] h-9 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleCollect()}
                    />
                    <Button 
                        size="sm" 
                        className="h-9 bg-shopee-orange hover:bg-shopee-orange-hover text-white"
                        onClick={handleCollect}
                        disabled={collecting}
                    >
                        {collecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu"}
                    </Button>
                </div>
            </div>

            <div className="sticky top-0 bg-white z-10 p-2 border-b">
                <Tabs defaultValue="all" onValueChange={setFilter}>
                    <TabsList className="bg-transparent justify-start h-auto p-0">
                        {[
                            { value: 'all', label: 'Tất cả' },
                            { value: 'active', label: 'Còn hiệu lực' },
                            { value: 'expired', label: 'Đã hết hạn' }
                        ].map(tab => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-6 py-2"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
                </div>
            ) : (
                <>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vouchers.map(voucher => (
                            <VoucherCard 
                                key={voucher.id} 
                                voucher={voucher}
                                isExpired={isExpired(voucher)}
                            />
                        ))}
                    </div>

                    {vouchers.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Ticket className="h-10 w-10 text-gray-300" />
                            </div>
                            <p>Chưa có voucher nào</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
