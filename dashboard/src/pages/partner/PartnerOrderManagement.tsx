import { useEffect, useState } from "react";
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

// Extended SubOrder with parent order info from backend
interface ShopOrder {
    id: string;
    orderId: string;
    shopId: string;
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    status: string;
    trackingNumber: string | null;
    shipperId: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
    items: Array<{
        id: string;
        productName: string;
        variantName: string | null;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        imageUrl: string | null;
    }>;
    order: {
        orderNumber: string;
        shippingName: string;
        shippingPhone: string;
        shippingAddress: string;
        paymentMethod: string;
        paymentStatus: string;
    } | null;
}

export default function PartnerOrderManagement() {
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    // Dialog state
    const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);

    useEffect(() => {
        loadOrders();
    }, [activeTab]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await orderService.getShopOrders({ status: activeTab === 'all' ? undefined : activeTab });
            setOrders(data.orders || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load orders");
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

    const handleCancelClick = (order: ShopOrder) => {
        setSelectedOrder(order);
        setCancelOpen(true);
    };

    const handleCancelConfirm = async (reason: string) => {
        if (!selectedOrder) return;
        try {
            await orderService.cancelByPartner(selectedOrder.id, reason);
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
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Chờ xác nhận</Badge>;
            case 'processing': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Đang xử lý</Badge>;
            case 'ready_to_ship': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Sẵn sàng giao</Badge>;
            case 'shipping': return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Đang giao</Badge>;
            case 'delivered': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đã giao</Badge>;
            case 'completed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoàn thành</Badge>;
            case 'cancelled': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Đã hủy</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const columns = [
        {
            header: "Mã đơn",
            cell: (order: ShopOrder) => (
                <div>
                    <span className="font-mono font-medium text-xs">{order.order?.orderNumber || order.id.slice(0, 8)}</span>
                </div>
            )
        },
        {
            header: "Khách hàng",
            cell: (order: ShopOrder) => (
                <div>
                    <div className="font-medium">{order.order?.shippingName || '-'}</div>
                    <div className="text-xs text-muted-foreground">{order.order?.shippingPhone || ''}</div>
                </div>
            )
        },
        {
            header: "Thanh toán",
            cell: (order: ShopOrder) => (
                <div>
                    <div className="text-sm">{order.order?.paymentMethod?.toUpperCase() || '-'}</div>
                    <Badge variant={order.order?.paymentStatus === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {order.order?.paymentStatus === 'paid' ? 'Đã TT' : 'Chưa TT'}
                    </Badge>
                </div>
            )
        },
        {
            header: "Tổng tiền",
            cell: (order: ShopOrder) => <span className="font-medium text-primary">{formatCurrency(order.total)}</span>
        },
        {
            header: "Trạng thái",
            cell: (order: ShopOrder) => getStatusBadge(order.status)
        },
        {
            header: "Thao tác",
            className: "text-right",
            cell: (order: ShopOrder) => (
                <div className="flex justify-end gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">Thao tác</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> Xem chi tiết</DropdownMenuItem>

                            {order.status === 'pending' && (
                                <>
                                    <DropdownMenuItem onClick={() => handleConfirm(order.id)}>
                                        <Check className="mr-2 h-4 w-4" /> Xác nhận đơn
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleCancelClick(order)}>
                                        <Ban className="mr-2 h-4 w-4" /> Hủy đơn
                                    </DropdownMenuItem>
                                </>
                            )}

                            {order.status === 'processing' && (
                                <>
                                    <DropdownMenuItem onClick={() => handlePack(order.id)}>
                                        <Package className="mr-2 h-4 w-4" /> Đóng gói
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleCancelClick(order)}>
                                        <Ban className="mr-2 h-4 w-4" /> Hủy đơn
                                    </DropdownMenuItem>
                                </>
                            )}

                            {order.status === 'ready_to_ship' && (
                                <DropdownMenuItem disabled>
                                    <Truck className="mr-2 h-4 w-4" /> Chờ shipper lấy hàng
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
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="pending">Chờ xác nhận</TabsTrigger>
                    <TabsTrigger value="processing">Đang xử lý</TabsTrigger>
                    <TabsTrigger value="ready_to_ship">Chờ lấy hàng</TabsTrigger>
                    <TabsTrigger value="shipping">Đang giao</TabsTrigger>
                </TabsList>

                {['all', 'pending', 'processing', 'ready_to_ship', 'shipping'].map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-0">
                        <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                            <DataTable
                                data={orders}
                                columns={columns}
                                searchPlaceholder="Tìm kiếm..."
                                isLoading={loading}
                            />
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            <CancelOrderDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                onConfirm={handleCancelConfirm}
                orderId={selectedOrder?.id || ""}
            />
        </div >
    );
}
