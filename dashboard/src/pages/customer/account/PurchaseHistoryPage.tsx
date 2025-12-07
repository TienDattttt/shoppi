import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderCard, type Order } from "@/components/customer/order/OrderCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const MOCK_ORDERS: Order[] = [
    {
        id: "ORD-001",
        shopId: "shop1",
        shopName: "Official Store VN",
        status: "Completed",
        items: [
            {
                id: "p1",
                name: "Wireless Headphones Bluetooth 5.0",
                image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
                variant: "Black",
                price: 450000,
                quantity: 1
            }
        ],
        total: 480000
    },
    {
        id: "ORD-002",
        shopId: "shop2",
        shopName: "Fashion Hub",
        status: "To Receive",
        items: [
            {
                id: "p2",
                name: "Cotton T-Shirt Basic",
                image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
                variant: "L, White",
                price: 120000,
                quantity: 2
            },
            {
                id: "p3",
                name: "Denim Jeans Slim Fit",
                image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
                variant: "32, Blue",
                price: 350000,
                quantity: 1
            }
        ],
        total: 620000
    }
];

export default function PurchaseHistoryPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const filteredOrders = MOCK_ORDERS.filter(order => {
        const matchesSearch = order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) || order.shopName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
                                {status}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by Shop name, Order ID or Product name"
                        className="pl-9 bg-gray-50 border-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <OrderCard key={order.id} order={order} />
                    ))
                ) : (
                    <div className="bg-white p-12 flex flex-col items-center justify-center text-gray-500 min-h-[400px]">
                        <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">📄</span>
                        </div>
                        <p>No orders found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
