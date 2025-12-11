import { useEffect } from "react";
import { CartItem } from "../../components/customer/cart/CartItem";
import { CartSummary } from "../../components/customer/cart/CartSummary";
import { VoucherInput } from "../../components/customer/cart/VoucherInput";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { Checkbox } from "@/components/ui/checkbox";
import { Store, ShoppingBag, Loader2 } from "lucide-react";
import { EmptyState } from "../../components/customer/common/EmptyState";

export default function CartPage() {
    const { items, loading, error, fetchCart, toggleShopSelection } = useCartStore();
    const { token } = useAuthStore();

    // Fetch cart on mount if user is logged in
    useEffect(() => {
        if (token) {
            fetchCart();
        }
    }, [token, fetchCart]);

    // Group items by shop
    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.shopId]) {
            acc[item.shopId] = {
                name: item.shopName,
                items: []
            };
        }
        acc[item.shopId].items.push(item);
        return acc;
    }, {} as Record<string, { name: string, items: typeof items }>);

    const shopIds = Object.keys(groupedItems);

    if (loading) {
        return (
            <div className="container mx-auto py-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    if (!token) {
        return (
            <div className="container mx-auto py-12">
                <EmptyState
                    title="Vui lòng đăng nhập"
                    description="Đăng nhập để xem giỏ hàng của bạn"
                    actionLabel="Đăng nhập"
                    actionHref="/login"
                    icon={ShoppingBag}
                />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="container mx-auto py-12">
                <EmptyState
                    title="Giỏ hàng trống"
                    description="Hãy mua sắm ngay để nhận nhiều ưu đãi!"
                    actionLabel="Mua sắm ngay"
                    actionHref="/"
                    icon={ShoppingBag}
                />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <div className="container mx-auto px-4 py-6 space-y-4">
                {/* Header Row */}
                <div className="hidden md:grid grid-cols-[auto_1fr_120px_120px_120px_50px] gap-4 bg-white p-4 rounded-sm shadow-sm text-sm text-gray-500 font-medium items-center">
                    <div className="w-8"></div> {/* Checkbox spacer */}
                    <div>Sản phẩm</div>
                    <div className="text-center">Đơn giá</div>
                    <div className="text-center">Số lượng</div>
                    <div className="text-center">Thành tiền</div>
                    <div className="text-center">Thao tác</div>
                </div>

                {/* Shop Groups */}
                {shopIds.map((shopId) => {
                    const shop = groupedItems[shopId];
                    const allShopSelected = shop.items.every(i => i.selected);

                    return (
                        <div key={shopId} className="bg-white rounded-sm shadow-sm overflow-hidden">
                            {/* Shop Header */}
                            <div className="p-4 border-b flex items-center gap-4">
                                <Checkbox
                                    checked={allShopSelected}
                                    onCheckedChange={(checked) => toggleShopSelection(shopId, checked as boolean)}
                                />
                                <div className="flex items-center gap-2 font-medium">
                                    <Store className="h-4 w-4 text-gray-500" />
                                    <span>{shop.name}</span>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                {shop.items.map((item) => (
                                    <CartItem key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Vouchers section */}
                <VoucherInput />

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-sm text-sm">
                        {error}
                    </div>
                )}
            </div>

            <CartSummary />
        </div>
    );
}
