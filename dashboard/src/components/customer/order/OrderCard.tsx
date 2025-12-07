import { useNavigate } from "react-router-dom";
import { MessageSquare, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

// Mock Order Type
export interface Order {
    id: string;
    shopId: string;
    shopName: string;
    status: 'To Pay' | 'To Ship' | 'To Receive' | 'Completed' | 'Cancelled';
    items: {
        id: string;
        name: string;
        image: string;
        variant?: string;
        price: number;
        quantity: number;
    }[];
    total: number;
}

interface OrderCardProps {
    order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
    const navigate = useNavigate();
    const firstItem = order.items[0];
    const otherItemsCount = order.items.length - 1;

    return (
        <div className="bg-white rounded-sm shadow-sm p-6 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2 font-medium">
                    <Store className="h-4 w-4" />
                    <span>{order.shopName}</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Visit Shop</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2 flex gap-1">
                        <MessageSquare className="h-3 w-3" /> Chat
                    </Button>
                </div>
                <div className="text-shopee-orange text-sm uppercase font-medium">
                    {order.status}
                </div>
            </div>

            {/* Product Preview */}
            <div
                className="flex gap-4 cursor-pointer"
                onClick={() => navigate(`/user/purchase/order/${order.id}`)}
            >
                <img
                    src={firstItem.image}
                    alt={firstItem.name}
                    className="h-20 w-20 object-cover rounded-sm border bg-muted"
                />
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-1">{firstItem.name}</h3>
                    {firstItem.variant && <div className="text-xs text-muted-foreground mt-1">Variation: {firstItem.variant}</div>}
                    <div className="text-sm mt-1">x{firstItem.quantity}</div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-shopee-orange">{formatCurrency(firstItem.price)}</span>
                    {firstItem.price < 500000 && <span className="text-xs text-muted-foreground line-through">{formatCurrency(firstItem.price * 1.2)}</span>}
                </div>
            </div>

            {otherItemsCount > 0 && (
                <div className="text-center text-xs text-gray-500 border-t border-dashed pt-2">
                    View {otherItemsCount} more products
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-end items-center gap-2 border-t pt-4">
                <div className="mr-4 text-sm">
                    Order Total: <span className="text-xl text-shopee-orange font-medium">{formatCurrency(order.total)}</span>
                </div>

                {order.status === 'Completed' ? (
                    <>
                        <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white">Buy Again</Button>
                        <Button variant="outline">Rate</Button>
                    </>
                ) : order.status === 'To Receive' ? (
                    <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white">Contact Seller</Button>
                ) : (
                    <Button variant="outline">Contact Seller</Button>
                )}
            </div>
        </div>
    );
}
