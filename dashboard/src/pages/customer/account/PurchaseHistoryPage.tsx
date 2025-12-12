import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderCard } from "@/components/customer/order/OrderCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { orderService, type Order } from "@/services/order.service";

// Map backend status to display status
function getDisplayStatus(order: Order): string {
    if (order.status === 'pending_payment') return 'To Pay';
    if (order.status === 'payment_failed') return 'Payment Failed';
    if (order.status === 'cancelled') return 'Cancelled';
    if (order.status === 'completed') return 'Completed';
    if (order.status === 'refunded') return 'Refunded';
    
    // Check sub-orders for more specific status
    const subOrders = order.subOrders || [];
    if (subOrders.some(so => so.status === 'shipping')) return 'To Receive';
    if (subOrders.some(so => so.status === 'ready_to_ship')) return 'To Ship';
    if (subOrders.some(so => so.status === 'delivered')) return 'To Receive';
    if (subOrders.some(so => so.status === 'pending' || so.status === 'confirmed' || so.status === 'processing')) return 'To Ship';
    
    return 'Processing';
}

// Transform Order to OrderCard format
function transformOrder(order: Order) {
    const items = order.subOrders?.flatMap(so => 
        so.items.map(item => ({
            id: item.id,
            name: item.productName,
            image: item.imageUrl || 'https://placehold.co/100x100?text=Product',
            variant: item.variantName || undefined,
            price: item.unitPrice,
            quantity: item.quantity,
        }))
    ) || [];

    return {
        id: order.id,
        orderNumber: order.orderNumber,
        shopId: order.subOrders?.[0]?.shopId || '',
        shopName: 'Shop', // TODO: Get shop name from API
        status: getDisplayStatus(order),
        items,
        total: order.grandTotal,
        createdAt: order.createdAt,
    };
}

export default function PurchaseHistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const result = await orderService.getOrders({ limit: 50 });
            setOrders(result.orders);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const transformed = transformOrder(order);
        const matchesSearch = 
            transformed.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
        
        const displayStatus = getDisplayStatus(order);
        const matchesStatus = statusFilter === "All" || displayStatus === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-sm shadow-sm sticky top-16 z-10">
                <Tabs defaultValue="All" className="w-full" onValueChange={setStatusFilter}>
                    <TabsList className="w-full justify-between bg-transparent h-auto p-0 border-b rounded-none">
                        {['All', 'To Pay', 'To Ship', 'To Receive', 'Completed', 'Cancelled'].map((status) => (
                            <TabsTrigger
                                key={status}
                                value={status}
                                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-shopee-orange data-[state=active]:text-shopee-orange pb-3 pt-3"
                            >
                                {status === 'All' ? 'Tất cả' : 
                                 status === 'To Pay' ? 'Chờ thanh toán' :
                                 status === 'To Ship' ? 'Chờ giao hàng' :
                                 status === 'To Receive' ? 'Đang giao' :
                                 status === 'Completed' ? 'Hoàn thành' :
                                 'Đã hủy'}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Tìm kiếm theo mã đơn hàng hoặc tên sản phẩm"
                        className="pl-9 bg-gray-50 border-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <OrderCard key={order.id} order={transformOrder(order)} />
                    ))
                ) : (
                    <div className="bg-white p-12 flex flex-col items-center justify-center text-gray-500 min-h-[400px]">
                        <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">📄</span>
                        </div>
                        <p>Chưa có đơn hàng nào</p>
                    </div>
                )}
            </div>
        </div>
    );
}
