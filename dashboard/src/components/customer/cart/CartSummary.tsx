import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";

export function CartSummary() {
    const { items, toggleAllSelection, selectedItemsCount, subtotal, total, discountAmount } = useCartStore();

    const allSelected = items.length > 0 && items.every(i => i.selected);

    return (
        <div className="sticky bottom-0 bg-white border-t py-4 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col md:flex-row items-center justify-between gap-4 z-40">
            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => toggleAllSelection(checked as boolean)}
                    />
                    <span className="text-sm">Chọn tất cả ({items.length})</span>
                </div>
                <button className="text-sm text-gray-500 hover:text-red-500">Xóa</button>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                <div className="flex flex-col items-end text-sm">
                    <div className="flex items-center gap-2">
                        <span>Tổng thanh toán ({selectedItemsCount()} sản phẩm):</span>
                        <span className="text-xl font-medium text-shopee-orange">{formatCurrency(total())}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="text-xs text-muted-foreground">
                            Tiết kiệm {formatCurrency(discountAmount)}
                        </div>
                    )}
                </div>
                <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white px-10 h-10 w-full md:w-auto">
                    Mua hàng
                </Button>
            </div>
        </div>
    );
}
