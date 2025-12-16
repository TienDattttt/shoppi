import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "@/services/order.service";
import { shipperService } from "@/services/shipper.service";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Truck, Check, Package, Ban, Download, MapPin, Clock, FileText } from "lucide-react";
import { DataTable } from "@/components/common/DataTable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CancelOrderDialog } from "@/components/partner/CancelOrderDialog";
import { PickupRequestModal } from "@/components/partner/shipping/PickupRequestModal";
import { ShippingLabelModal } from "@/components/partner/shipping/ShippingLabelModal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Use SubOrder type from order.service
import type { SubOrder } from "@/services/order.service";

// Extended SubOrder with shipment info
interface ShopOrderWithShipment extends SubOrder {
    shipment?: {
        id: string;
        trackingNumber: string;
        status: string;
        statusVi: string;
        shipper?: {
            id: string;
            name: string;
            phone: string;
            vehiclePlate?: string;
        };
        estimatedPickup?: string;
        estimatedDelivery?: string;
    };
}

type ShopOrder = ShopOrderWithShipment;

export default function PartnerOrderManagement() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    // Dialog states
    const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    
    // Ready to ship confirmation dialog
    const [readyToShipOpen, setReadyToShipOpen] = useState(false);
    const [readyToShipLoading, setReadyToShipLoading] = useState(false);
    const [createdShipment, setCreatedShipment] = useState<{
        trackingNumber: string;
        estimatedPickup?: string;
    } | null>(null);
    
    // Pickup request modal
    const [pickupModalOpen, setPickupModalOpen] = useState(false);
    const [selectedShipmentForPickup, setSelectedShipmentForPickup] = useState<{
        id: string;
        trackingNumber: string;
    } | null>(null);
    
    // Shipping label modal
    const [shippingLabelOpen, setShippingLabelOpen] = useState(false);
    const [selectedShipmentForLabel, setSelectedShipmentForLabel] = useState<string>("");

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
            toast.error("Không thể tải danh sách đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    // Optimistic update helper - update order status locally
    const updateOrderStatus = (orderId: string, newStatus: string) => {
        setOrders(prev => prev.map(order => 
            order.id === orderId ? { ...order, status: newStatus as ShopOrder['status'] } : order
        ));
    };

    // Remove order from list (for filtered views)
    const removeOrderFromList = (orderId: string) => {
        setOrders(prev => prev.filter(order => order.id !== orderId));
    };

    const handleConfirm = async (id: string) => {
        const previousOrders = [...orders];
        updateOrderStatus(id, 'processing');
        
        if (activeTab === 'pending') {
            removeOrderFromList(id);
        }
        
        try {
            await orderService.confirmOrder(id);
            toast.success("Đã xác nhận đơn hàng");
        } catch (error) {
            setOrders(previousOrders);
            toast.error("Xác nhận đơn thất bại");
        }
    };

    const handlePack = async (id: string) => {
        const previousOrders = [...orders];
        updateOrderStatus(id, 'ready_to_ship');
        
        if (activeTab === 'processing') {
            removeOrderFromList(id);
        }
        
        try {
            await orderService.packOrder(id);
            toast.success("Đã đóng gói đơn hàng");
        } catch (error) {
            setOrders(previousOrders);
            toast.error("Đóng gói đơn thất bại");
        }
    };

    // Handle Ready to Ship click - open confirmation dialog
    const handleReadyToShipClick = (order: ShopOrder) => {
        setSelectedOrder(order);
        setCreatedShipment(null);
        setReadyToShipOpen(true);
    };

    // Confirm ready to ship - create shipment
    const handleReadyToShipConfirm = async () => {
        if (!selectedOrder) return;
        
        setReadyToShipLoading(true);
        try {
            const response = await shipperService.markReadyToShip(selectedOrder.id);
            const shipmentData = response.data?.shipment || response.shipment;
            
            // Show success with tracking number
            setCreatedShipment({
                trackingNumber: shipmentData?.trackingNumber || shipmentData?.tracking_number || 'N/A',
                estimatedPickup: shipmentData?.estimatedPickup || shipmentData?.estimated_pickup,
            });
            
            toast.success("Đã tạo đơn vận chuyển thành công");
            
            // Reload orders to get shipment data
            loadOrders();
        } catch (error: any) {
            console.error(error);
            const errorCode = error.response?.data?.error?.code || '';
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || "Không thể tạo đơn vận chuyển";
            
            // If shipment already exists, reload to show it
            if (errorCode === 'SHIPMENT_EXISTS') {
                toast.info("Đơn vận chuyển đã được tạo, đang tải lại...");
                loadOrders();
                setReadyToShipOpen(false);
            } else if (errorMessage.includes('ready_to_ship') || errorMessage.includes('INVALID_STATUS')) {
                toast.info("Đơn hàng đã sẵn sàng giao, đang tải lại...");
                loadOrders();
                setReadyToShipOpen(false);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setReadyToShipLoading(false);
        }
    };

    // Handle request pickup click
    const handleRequestPickupClick = (order: ShopOrder) => {
        if (order.shipment) {
            setSelectedShipmentForPickup({
                id: order.shipment.id,
                trackingNumber: order.shipment.trackingNumber,
            });
            setPickupModalOpen(true);
        }
    };

    // Confirm pickup request
    const handlePickupConfirm = async (data: { preferredTime: string; notes?: string }) => {
        if (!selectedShipmentForPickup) return;
        
        try {
            await shipperService.requestPickup(selectedShipmentForPickup.id, data);
            toast.success("Đã yêu cầu lấy hàng thành công");
            loadOrders(); // Reload to get updated data
        } catch (error) {
            console.error(error);
            toast.error("Không thể yêu cầu lấy hàng");
            throw error;
        }
    };

    // View shipment tracking
    const handleViewTracking = (shipmentId: string) => {
        navigate(`/partner/shipments/${shipmentId}`);
    };

    const handleCancelClick = (order: ShopOrder) => {
        setSelectedOrder(order);
        setCancelOpen(true);
    };

    const handleCancelConfirm = async (reason: string) => {
        if (!selectedOrder) return;
        
        const previousOrders = [...orders];
        updateOrderStatus(selectedOrder.id, 'cancelled');
        
        if (activeTab !== 'all') {
            removeOrderFromList(selectedOrder.id);
        }
        
        try {
            await orderService.cancelByPartner(selectedOrder.id, reason);
            toast.success("Đã hủy đơn hàng");
        } catch (error) {
            setOrders(previousOrders);
            toast.error("Hủy đơn thất bại");
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Chờ xác nhận</Badge>;
            case 'processing': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Đang xử lý</Badge>;
            case 'ready_to_ship': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Chờ lấy hàng</Badge>;
            case 'shipping': return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Đang giao</Badge>;
            case 'delivered': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đã giao</Badge>;
            case 'completed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoàn thành</Badge>;
            case 'cancelled': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Đã hủy</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getShipmentStatusBadge = (shipment?: ShopOrder['shipment']) => {
        if (!shipment) {
            return <span className="text-muted-foreground text-xs">Chưa tạo</span>;
        }
        
        const statusMap: Record<string, { className: string; label: string }> = {
            created: { className: "bg-gray-50 text-gray-700 border-gray-200", label: "Đã tạo" },
            assigned: { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Đã phân công" },
            picked_up: { className: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Đã lấy hàng" },
            in_transit: { className: "bg-purple-50 text-purple-700 border-purple-200", label: "Đang vận chuyển" },
            out_for_delivery: { className: "bg-orange-50 text-orange-700 border-orange-200", label: "Đang giao" },
            delivering: { className: "bg-orange-50 text-orange-700 border-orange-200", label: "Đang giao" },
            delivered: { className: "bg-green-50 text-green-700 border-green-200", label: "Đã giao" },
            failed: { className: "bg-red-50 text-red-700 border-red-200", label: "Giao thất bại" },
        };
        
        const style = statusMap[shipment.status] || { className: "", label: shipment.statusVi || shipment.status };
        
        return (
            <Badge variant="outline" className={style.className}>
                {style.label}
            </Badge>
        );
    };


    const columns = [
        {
            header: "Mã đơn",
            cell: (order: ShopOrder) => (
                <div>
                    <span className="font-mono font-medium text-xs">{order.order?.orderNumber || order.id.slice(0, 8)}</span>
                    {order.shipment?.trackingNumber && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                            <Truck className="inline h-3 w-3 mr-1" />
                            {order.shipment.trackingNumber}
                        </div>
                    )}
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
            header: "Trạng thái đơn",
            cell: (order: ShopOrder) => getStatusBadge(order.status)
        },
        {
            header: "Vận chuyển",
            cell: (order: ShopOrder) => (
                <div>
                    {getShipmentStatusBadge(order.shipment)}
                    {order.shipment?.shipper ? (
                        <div className="text-xs mt-1 space-y-0.5">
                            <div className="flex items-center gap-1 text-green-600 font-medium">
                                <Truck className="h-3 w-3" />
                                {order.shipment.shipper.name}
                            </div>
                            {order.shipment.shipper.phone && (
                                <div className="text-muted-foreground">{order.shipment.shipper.phone}</div>
                            )}
                            {order.shipment.shipper.vehiclePlate && (
                                <div className="text-muted-foreground">{order.shipment.shipper.vehiclePlate}</div>
                            )}
                        </div>
                    ) : order.shipment?.estimatedPickup ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            Lấy: {new Date(order.shipment.estimatedPickup).toLocaleString('vi-VN', { 
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                            })}
                        </div>
                    ) : null}
                </div>
            )
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
                            <DropdownMenuItem onClick={() => navigate(`/partner/orders/${order.id}`)}>
                                <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                            </DropdownMenuItem>

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
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleReadyToShipClick(order)}>
                                        <Truck className="mr-2 h-4 w-4" /> Sẵn sàng giao hàng
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleCancelClick(order)}>
                                        <Ban className="mr-2 h-4 w-4" /> Hủy đơn
                                    </DropdownMenuItem>
                                </>
                            )}

                            {order.status === 'ready_to_ship' && (
                                <>
                                    {order.shipment ? (
                                        <>
                                            <DropdownMenuItem onClick={() => {
                                                setSelectedShipmentForLabel(order.shipment!.id);
                                                setShippingLabelOpen(true);
                                            }}>
                                                <FileText className="mr-2 h-4 w-4" /> Xem phiếu giao hàng
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleViewTracking(order.shipment!.id)}>
                                                <MapPin className="mr-2 h-4 w-4" /> Xem vận đơn
                                            </DropdownMenuItem>
                                            {/* Show pickup request option - can update pickup time if not yet picked up */}
                                            {['created', 'assigned'].includes(order.shipment.status) && (
                                                <DropdownMenuItem onClick={() => handleRequestPickupClick(order)}>
                                                    <Clock className="mr-2 h-4 w-4" /> 
                                                    {order.shipment.shipper ? 'Đổi giờ lấy hàng' : 'Yêu cầu lấy hàng'}
                                                </DropdownMenuItem>
                                            )}
                                        </>
                                    ) : (
                                        <DropdownMenuItem onClick={() => handleReadyToShipClick(order)}>
                                            <Truck className="mr-2 h-4 w-4" /> Tạo đơn vận chuyển
                                        </DropdownMenuItem>
                                    )}
                                </>
                            )}

                            {order.status === 'shipping' && order.shipment && (
                                <DropdownMenuItem onClick={() => handleViewTracking(order.shipment!.id)}>
                                    <MapPin className="mr-2 h-4 w-4" /> Theo dõi vận đơn
                                </DropdownMenuItem>
                            )}

                            {(order.status === 'delivered' || order.status === 'completed') && order.shipment && (
                                <DropdownMenuItem onClick={() => handleViewTracking(order.shipment!.id)}>
                                    <Eye className="mr-2 h-4 w-4" /> Xem chi tiết giao hàng
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        }
    ];


    // Get shop address for pickup modal
    const getShopAddress = () => {
        // This would typically come from the shop profile
        return "Địa chỉ cửa hàng của bạn";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Quản lý đơn hàng</h1>
                    <p className="text-muted-foreground mt-1">Quản lý đơn hàng và vận chuyển</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Xuất báo cáo
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="pending">Chờ xác nhận</TabsTrigger>
                    <TabsTrigger value="processing">Đang xử lý</TabsTrigger>
                    <TabsTrigger value="ready_to_ship" className="gap-1">
                        <Package className="h-4 w-4" />
                        Chờ lấy hàng
                    </TabsTrigger>
                    <TabsTrigger value="shipping" className="gap-1">
                        <Truck className="h-4 w-4" />
                        Đang giao
                    </TabsTrigger>
                    <TabsTrigger value="delivered">Đã giao</TabsTrigger>
                </TabsList>

                {['all', 'pending', 'processing', 'ready_to_ship', 'shipping', 'delivered'].map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-0">
                        <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                            <DataTable
                                data={orders}
                                columns={columns}
                                searchPlaceholder="Tìm kiếm đơn hàng..."
                                isLoading={loading}
                            />
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* Cancel Order Dialog */}
            <CancelOrderDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                onConfirm={handleCancelConfirm}
                orderId={selectedOrder?.id || ""}
            />

            {/* Ready to Ship Confirmation Dialog */}
            <Dialog open={readyToShipOpen} onOpenChange={setReadyToShipOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            {createdShipment ? "Đã tạo đơn vận chuyển" : "Xác nhận sẵn sàng giao hàng"}
                        </DialogTitle>
                        <DialogDescription>
                            {createdShipment 
                                ? "Đơn vận chuyển đã được tạo thành công. Shipper sẽ đến lấy hàng theo lịch."
                                : "Xác nhận đơn hàng đã sẵn sàng để giao. Hệ thống sẽ tự động phân công shipper."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {createdShipment ? (
                        <div className="py-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2 text-green-700">
                                    <Check className="h-5 w-5" />
                                    <span className="font-medium">Tạo đơn thành công!</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Mã vận đơn:</span>
                                        <span className="font-mono font-medium">{createdShipment.trackingNumber}</span>
                                    </div>
                                    {createdShipment.estimatedPickup && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Dự kiến lấy hàng:</span>
                                            <span>{new Date(createdShipment.estimatedPickup).toLocaleString('vi-VN')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4">
                            {selectedOrder && (
                                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Mã đơn:</span>
                                        <span className="font-mono">{selectedOrder.order?.orderNumber || selectedOrder.id.slice(0, 8)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Khách hàng:</span>
                                        <span>{selectedOrder.order?.shippingName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tổng tiền:</span>
                                        <span className="font-medium text-primary">{formatCurrency(selectedOrder.total)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {createdShipment ? (
                            <Button onClick={() => setReadyToShipOpen(false)}>
                                Đóng
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setReadyToShipOpen(false)}
                                    disabled={readyToShipLoading}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleReadyToShipConfirm}
                                    disabled={readyToShipLoading}
                                >
                                    {readyToShipLoading ? "Đang xử lý..." : "Xác nhận"}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pickup Request Modal */}
            {selectedShipmentForPickup && (
                <PickupRequestModal
                    open={pickupModalOpen}
                    onOpenChange={setPickupModalOpen}
                    shipmentId={selectedShipmentForPickup.id}
                    trackingNumber={selectedShipmentForPickup.trackingNumber}
                    shopAddress={getShopAddress()}
                    onConfirm={handlePickupConfirm}
                />
            )}

            {/* Shipping Label Modal */}
            <ShippingLabelModal
                open={shippingLabelOpen}
                onOpenChange={setShippingLabelOpen}
                shipmentId={selectedShipmentForLabel}
            />
        </div>
    );
}
