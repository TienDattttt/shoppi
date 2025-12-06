import { useEffect, useState } from "react";
import type { Order } from "@/services/order.service";
import { orderService } from "@/services/order.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Truck, CheckCircle, XCircle } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/common/DataTable";

export default function OrderManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await orderService.getAllOrders();
            setOrders(data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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
            header: "Shop",
            accessorKey: "shopName" as keyof Order,
            className: "hidden md:table-cell"
        },
        {
            header: "Total",
            cell: (order: Order) => <span className="font-medium">{formatCurrency(order.order_checkout.totalPrice)}</span>
        },
        {
            header: "Items",
            cell: (order: Order) => <span>{order.order_products.length} items</span>
        },
        {
            header: "Status",
            cell: (order: Order) => getStatusBadge(order.order_status)
        },
        {
            header: "Date",
            cell: (order: Order) => <span className="text-xs text-muted-foreground">{order.createdAt}</span>
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (order: Order) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Order Management</h1>
                    <p className="text-muted-foreground mt-1">Track and manage all system orders</p>
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                <DataTable
                    data={orders}
                    columns={columns}
                    searchKey="userName"
                    searchPlaceholder="Search orders..."
                    isLoading={loading}
                />
            </div>
        </div>
    );
}
