import { useNavigate } from "react-router-dom";
import { MessageSquare, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export interface Order {
    id: string;
    orderNumber?: string;
    shopId: string;
    shopName: string;
    status: string;
    items: {
        id: string;
        name: string;
        image: string;
        variant?: string;
        price: number;
        quantity: number;
    }[];
    total: number;
    createdAt?: string;
}

// Map status to Vietnamese
function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        'To Pay': 'Chờ thanh toán',
        'To Ship': 'Chờ giao hàng',
        'To Receive': 'Đang giao',
        'Completed': 'Hoàn thành',
        'Cancelled': 'Đã hủy',
        'Payment Failed': 'Thanh toán thất bại',
        'Processing': 'Đang xử lý',
        'Refunded': 'Đã hoàn tiền',
    };
    return statusMap[status] || status;
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
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Xem Shop</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2 flex gap-1">
                        <MessageSquare className="h-3 w-3" /> Chat
                    </Button>
                </div>
                <div className="text-shopee-orange text-sm uppercase font-medium">
                    {getStatusText(order.status)}
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
                    {firstItem.variant && <div className="text-xs text-muted-foreground mt-1">Phân loại: {firstItem.variant}</div>}
                    <div className="text-sm mt-1">x{firstItem.quantity}</div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-shopee-orange">{formatCurrency(firstItem.price)}</span>
                    {firstItem.price < 500000 && <span className="text-xs text-muted-foreground line-through">{formatCurrency(firstItem.price * 1.2)}</span>}
                </div>
            </div>

            {otherItemsCount > 0 && (
                <div className="text-center text-xs text-gray-500 border-t border-dashed pt-2">
                    Xem thêm {otherItemsCount} sản phẩm khác
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-end items-center gap-2 border-t pt-4">
                <div className="mr-4 text-sm">
                    Tổng đơn hàng: <span className="text-xl text-shopee-orange font-medium">{formatCurrency(order.total)}</span>
                </div>

                {order.status === 'Completed' ? (
                    <>
                        <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white">Mua lại</Button>
                        <Button variant="outline">Đánh giá</Button>
                    </>
                ) : order.status === 'To Receive' ? (
                    <Button className="bg-shopee-orange hover:bg-shopee-orange-hover text-white">Liên hệ người bán</Button>
                ) : (
                    <Button variant="outline">Liên hệ người bán</Button>
                )}
            </div>
        </div>
    );
}
