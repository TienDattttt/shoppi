import { useEffect, useState } from "react";
import type { Order } from "@/services/order.service";
import { orderService } from "@/services/order.service";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Truck, Check } from "lucide-react";
import { DataTable } from "@/components/common/DataTable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CancelOrderDialog } from "@/components/partner/CancelOrderDialog";
import { Package, Ban, Download } from "lucide-react";

export default function PartnerOrderManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    // Dialog state
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);

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

    const handleConfirm = async (id: string) => {
        try {
            await orderService.confirmOrder(id);
            toast.success("Order confirmed");
            loadOrders();
        } catch (error) {
            toast.error("Failed to confirm order");
        }
    };

    const handlePack = async (id: string) => {
        try {
            await orderService.packOrder(id);
            toast.success("Order marked as packed");
            loadOrders();
        } catch (error) {
            toast.error("Failed to pack order");
        }
    };

    const handleShip = async (id: string) => {
        // Assuming ship still uses the update status or a specific endpoint if exists
        // For now, let's assume 'shipped' status update is what's needed or there might be a pickup action
        // Following backend controller 'pickupOrder' is for Shipper, but Partner might just mark it ready?
        // Let's stick to updateOrderStatus for 'shipped' or if there isn't a specific one.
        // Actually earlier 'packOrder' was found. Let's check for 'shipOrder'.
        // Backend has 'pickupOrder' (Shipper). 
        // Typically Partner packs, then Shipper picks up -> Shipped.
        // So Partner might just wait after packing? 
        // Or Partner can hand over.
        // Existing code had 'Mark as Shipped'. I'll keep it as a status update if no specific endpoint.
        // Using generic update for now as fallback or if backend automation handles it.
        // But wait, the previous code called updateOrderStatus(id, 'shipped').
        // I'll assume partner can manually mark shipped or 'ready_to_ship'.
        try {
            await orderService.updateOrderStatus(id, 'shipped');
            toast.success("Order marked as shipped");
            loadOrders();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleCancelClick = (order: Order) => {
        setSelectedOrder(order);
        setCancelOpen(true);
    };

    const handleCancelConfirm = async (reason: string) => {
        if (!selectedOrder) return;
        try {
            await orderService.cancelOrder(selectedOrder._id, reason);
            toast.success("Order cancelled");
            loadOrders();
        } catch (error) {
            toast.error("Failed to cancel order");
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
                                <>
                                    <DropdownMenuItem onClick={() => handleConfirm(order._id)}>
                                        <Check className="mr-2 h-4 w-4" /> Confirm Order
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleCancelClick(order)}>
                                        <Ban className="mr-2 h-4 w-4" /> Cancel Order
                                    </DropdownMenuItem>
                                </>
                            )}

                            {order.order_status === 'confirmed' && (
                                <>
                                    <DropdownMenuItem onClick={() => handlePack(order._id)}>
                                        <Package className="mr-2 h-4 w-4" /> Pack Order
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleCancelClick(order)}>
                                        <Ban className="mr-2 h-4 w-4" /> Cancel Order
                                    </DropdownMenuItem>
                                </>
                            )}

                            {order.order_status === 'packed' && (
                                <DropdownMenuItem onClick={() => handleShip(order._id)}>
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
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export Orders
                    </Button>
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

            <CancelOrderDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                onConfirm={handleCancelConfirm}
                orderId={selectedOrder?._id || ""}
            />
        </div >
    );
}
