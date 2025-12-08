import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "@/services/order.service";

// Extended Order type for admin view
interface AdminOrder {
    id: string;
    _id: string;
    userName: string;
    shopName: string;
    order_status: string;
    order_checkout: { totalPrice: number };
    order_products: any[];
    createdAt: string;
    total_amount: number;
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Download } from "lucide-react";
import { DataTable } from "@/components/common/DataTable";

export default function OrderManagement() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const response = await orderService.getAllOrders();
            const data = response?.data || response || [];
            setOrders(Array.isArray(data) ? data : []);
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
            cell: (order: AdminOrder) => <span className="font-mono font-medium text-xs">{order._id?.slice(0, 8)}...</span>
        },
        {
            header: "Customer",
            accessorKey: "userName" as keyof AdminOrder,
        },
        {
            header: "Shop",
            accessorKey: "shopName" as keyof AdminOrder,
            className: "hidden md:table-cell"
        },
        {
            header: "Total",
            cell: (order: AdminOrder) => <span className="font-medium">{formatCurrency(order.order_checkout?.totalPrice || order.total_amount || 0)}</span>
        },
        {
            header: "Items",
            cell: (order: AdminOrder) => <span>{order.order_products?.length || 0} items</span>
        },
        {
            header: "Status",
            cell: (order: AdminOrder) => getStatusBadge(order.order_status)
        },
        {
            header: "Date",
            cell: (order: AdminOrder) => <span className="text-xs text-muted-foreground">{order.createdAt}</span>
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (order: AdminOrder) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/orders/${order._id}`)}>
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
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Export Report
                </Button>
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
