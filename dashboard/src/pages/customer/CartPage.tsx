import { Link } from "react-router-dom";
import { CartItem } from "../../components/customer/cart/CartItem";
import { CartSummary } from "../../components/customer/cart/CartSummary";
import { VoucherInput } from "../../components/customer/cart/VoucherInput";
import { useCartStore } from "@/store/cartStore";
import { Checkbox } from "@/components/ui/checkbox";
import { Store, ShoppingBag } from "lucide-react";
import { EmptyState } from "../../components/customer/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function CartPage() {
    const { items, toggleShopSelection } = useCartStore();

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

    if (items.length === 0) {
        return (
            <div className="container mx-auto py-12">
                <EmptyState
                    title="Your shopping cart is empty"
                    description="Go shopping now to get great deals!"
                    actionLabel="Go Shopping Now"
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
                    <div>Product</div>
                    <div className="text-center">Unit Price</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-center">Total Price</div>
                    <div className="text-center">Actions</div>
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

            </div>

            <CartSummary />
        </div>
    );
}
