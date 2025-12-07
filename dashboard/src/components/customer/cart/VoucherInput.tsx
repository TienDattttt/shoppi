import { useState } from "react";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

export function VoucherInput() {
    const { applyVoucher, voucherCode, removeVoucher } = useCartStore();
    const [code, setCode] = useState("");

    const handleApply = async () => {
        if (!code) return;
        const success = await applyVoucher(code);
        if (success) {
            toast.success("Voucher applied successfully!");
            setCode("");
        } else {
            toast.error("Invalid voucher code");
        }
    };

    return (
        <div className="bg-white p-4 rounded-sm shadow-sm flex items-center justify-between border-b border-dashed">
            <div className="flex items-center gap-2 text-shopee-orange font-medium text-sm">
                <Ticket className="h-5 w-5" />
                <span>Platform Voucher</span>
            </div>

            {voucherCode ? (
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                        {voucherCode} applied
                    </span>
                    <button onClick={removeVoucher} className="text-xs text-blue-500 hover:underline">
                        Remove
                    </button>
                </div>
            ) : (
                <div className="flex gap-2">
                    <input
                        placeholder="Enter Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="text-sm border-b focus:outline-none focus:border-shopee-orange px-2 py-1 w-32"
                    />
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-shopee-orange hover:text-shopee-orange hover:bg-orange-50 h-8 font-medium"
                        onClick={handleApply}
                    >
                        Apply
                    </Button>
                </div>
            )}
        </div>
    );
}
