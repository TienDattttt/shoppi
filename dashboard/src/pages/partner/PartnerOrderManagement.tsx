import { useEffect, useState } from "react";
import type { Order } from "@/services/order.service";
import { orderService } from "@/services/order.service";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Truck, Check, Store } from "lucide-react";
import { DataTable } from "@/components/common/DataTable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PartnerOrderManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        loadOrders();
    }, [activeTab]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await orderService.getShopOrders({ status: activeTab === 'all' ? undefined : activeTab });
            setOrders(data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        await orderService.updateOrderStatus(id, status);
        loadOrders();
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case 'confirmed': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Confirmed</Badge>;
            case 'shipped': return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Shipped</Badge>;
            case 'delivered': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
            case 'cancelled': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const columns = [
        {
            header: "Order ID",
            cell: (order: Order) => <span className="font-mono font-medium text-xs">{order._id}</span>
        },
        {
            header: "Customer",
            accessorKey: "userName" as keyof Order,
        },
        {
            header: "Payment",
            accessorKey: "order_payment" as keyof Order,
        },
        {
            header: "Total",
            cell: (order: Order) => <span className="font-medium text-primary">{formatCurrency(order.order_checkout.totalPrice)}</span>
        },
        {
            header: "Status",
            cell: (order: Order) => getStatusBadge(order.order_status)
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (order: Order) => (
                <div className="flex justify-end gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                            {order.order_status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order._id, 'confirmed')}>
                                    <Check className="mr-2 h-4 w-4" /> Confirm Order
                                </DropdownMenuItem>
                            )}
                            {order.order_status === 'confirmed' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order._id, 'shipped')}>
                                    <Truck className="mr-2 h-4 w-4" /> Mark as Shipped
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Shop Orders</h1>
                    <p className="text-muted-foreground mt-1">Manage coming orders and shipments</p>
                </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="all">All Orders</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="confirmed">To Ship</TabsTrigger>
                    <TabsTrigger value="shipped">Shipping</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                    <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                        <DataTable
                            data={orders}
                            columns={columns}
                            searchKey="userName"
                            searchPlaceholder="Search customer..."
                            isLoading={loading}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="pending" className="mt-0">
                    <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                        <DataTable
                            data={orders}
                            columns={columns}
                            searchKey="userName"
                            searchPlaceholder="Search customer..."
                            isLoading={loading}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="confirmed" className="mt-0">
                    <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                        <DataTable
                            data={orders}
                            columns={columns}
                            searchKey="userName"
                            searchPlaceholder="Search customer..."
                            isLoading={loading}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="shipped" className="mt-0">
                    <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                        <DataTable
                            data={orders}
                            columns={columns}
                            searchKey="userName"
                            searchPlaceholder="Search customer..."
                            isLoading={loading}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
