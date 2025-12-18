import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Truck, CreditCard, Loader2, Star, Package, CheckCircle2, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { orderService, type Order } from "@/services/order.service";
import { 
    shipperService, 
    type TrackingResponse, 
    type ShipperLocationResponse,
    type OrderShipment 
} from "@/services/shipper.service";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ReviewModal } from "@/components/customer/review/ReviewModal";
import { TrackingTimeline } from "@/components/customer/order/TrackingTimeline";
import { ShipperLocationMap, type ShipperLocation, type LocationPoint } from "@/components/customer/order/ShipperLocationMap";
import { ShipperInfo, type ShipperInfoData } from "@/components/customer/order/ShipperInfo";
import { ETADisplay } from "@/components/customer/order/ETADisplay";
import { ShipperRatingModal, type ShipmentRatingInfo } from "@/components/customer/order/ShipperRatingModal";
import { supabase, isRealtimeAvailable } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Map status to Vietnamese
function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        'pending_payment': 'Chờ thanh toán',
        'payment_failed': 'Thanh toán thất bại',
        'confirmed': 'Đã xác nhận',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy',
        'refunded': 'Đã hoàn tiền',
        'pending': 'Chờ xác nhận',
        'processing': 'Đang xử lý',
        'ready_to_ship': 'Chờ lấy hàng',
        'shipping': 'Đang giao',
        'delivered': 'Đã giao',
        'return_requested': 'Yêu cầu trả hàng',
        'return_approved': 'Đã duyệt trả hàng',
        'returned': 'Đã trả hàng',
    };
    return statusMap[status] || status;
}

function getPaymentMethodText(method: string): string {
    const methodMap: Record<string, string> = {
        'cod': 'Thanh toán khi nhận hàng (COD)',
        'momo': 'Ví MoMo',
        'vnpay': 'VNPay',
        'zalopay': 'ZaloPay',
    };
    return methodMap[method] || method;
}

// Check if shipment is in active delivery/transit status (show map)
function isInTransitOrDelivering(status: string): boolean {
    return ['picked_up', 'in_transit', 'out_for_delivery', 'delivering', 'shipping', 'ready_for_delivery'].includes(status);
}

// Check if shipment is actively being delivered (shipper on the way to customer)
function isDelivering(status: string): boolean {
    return ['out_for_delivery', 'delivering', 'shipping', 'ready_for_delivery'].includes(status);
}

// Check if shipper is assigned
function hasShipperAssigned(status: string): boolean {
    return ['assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivering', 'shipping', 'delivered', 'ready_for_delivery'].includes(status);
}

export default function OrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showShipperRatingModal, setShowShipperRatingModal] = useState(false);
    
    // Tracking state
    const [orderShipments, setOrderShipments] = useState<OrderShipment[]>([]);
    const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
    const [trackingData, setTrackingData] = useState<TrackingResponse | null>(null);
    const [shipperLocation, setShipperLocation] = useState<ShipperLocationResponse | null>(null);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [locationChannel, setLocationChannel] = useState<RealtimeChannel | null>(null);

    useEffect(() => {
        if (id) {
            fetchOrder();
            fetchOrderShipments();
        }
        
        return () => {
            // Cleanup realtime subscription
            if (locationChannel) {
                locationChannel.unsubscribe();
            }
        };
    }, [id]);

    // Auto-confirm payment when viewing order with pending_payment status and non-COD payment
    // This handles the case where user navigates directly to order detail instead of going through /payment/success
    // Only trigger if order was created more than 30 seconds ago (to avoid calling before user completes payment)
    useEffect(() => {
        let retryCount = 0;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        
        const confirmPendingPayment = async () => {
            if (!order || !id) return;
            
            // Check if order was created recently (within 30 seconds)
            // If so, don't auto-confirm - user might still be on payment page
            const orderCreatedAt = new Date(order.createdAt).getTime();
            const now = Date.now();
            const orderAgeSeconds = (now - orderCreatedAt) / 1000;
            
            if (orderAgeSeconds < 30) {
                console.log('[OrderDetailPage] Order too new, skipping auto-confirm. Age:', orderAgeSeconds, 'seconds');
                return;
            }
            
            // Only confirm if:
            // 1. Order status is pending_payment
            // 2. Payment method is not COD (online payment)
            // 3. Payment status is not already paid
            if (
                order.status === 'pending_payment' && 
                order.paymentMethod !== 'cod' &&
                order.paymentStatus !== 'paid'
            ) {
                console.log('[OrderDetailPage] Auto-confirming payment for order:', id, 'attempt:', retryCount + 1);
                try {
                    const result = await orderService.confirmPayment(id);
                    console.log('[OrderDetailPage] Payment confirmation result:', result);
                    
                    if (result.paymentStatus === 'paid') {
                        toast.success('Thanh toán đã được xác nhận thành công!');
                        // Refresh order to get updated status
                        fetchOrder();
                    } else if (result.paymentStatus === 'pending' && retryCount < 3) {
                        // Retry after delay for ZaloPay sandbox
                        retryCount++;
                        timeoutId = setTimeout(confirmPendingPayment, 3000);
                    }
                } catch (error) {
                    console.error('[OrderDetailPage] Failed to confirm payment:', error);
                    // Don't show error toast - payment might not be completed yet
                }
            }
        };

        confirmPendingPayment();
        
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [order?.id, order?.status, order?.paymentMethod, order?.paymentStatus]);

    // Fetch tracking data when selected shipment changes
    useEffect(() => {
        if (selectedShipmentId) {
            fetchTrackingData(selectedShipmentId);
        }
    }, [selectedShipmentId]);

    // Auto-show shipper rating modal when order is delivered
    // Requirements: 15.1 - Prompt customer to rate delivery after completion
    useEffect(() => {
        // Check if there are delivered shipments with shippers that can be rated
        const deliveredWithShipper = orderShipments.filter(
            s => s.status === 'delivered' && s.shipper
        );
        
        // Only auto-show if:
        // 1. There are delivered shipments with shippers
        // 2. The order was recently delivered (check URL param or localStorage)
        if (deliveredWithShipper.length > 0) {
            const ratingPromptKey = `shipper_rating_prompted_${id}`;
            const alreadyPrompted = localStorage.getItem(ratingPromptKey);
            
            if (!alreadyPrompted) {
                // Show rating modal after a short delay
                const timer = setTimeout(() => {
                    setShowShipperRatingModal(true);
                    localStorage.setItem(ratingPromptKey, 'true');
                }, 1000);
                
                return () => clearTimeout(timer);
            }
        }
    }, [orderShipments, id]);

    const fetchOrder = async () => {
        setLoading(true);
        try {
            const data = await orderService.getOrderById(id!);
            setOrder(data);
        } catch (error) {
            console.error("Failed to fetch order:", error);
            toast.error("Không thể tải thông tin đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderShipments = async () => {
        try {
            const response = await shipperService.getOrderShipments(id!);
            setOrderShipments(response.shipments);
            
            // Auto-select first shipment if available
            if (response.shipments.length > 0 && !selectedShipmentId) {
                setSelectedShipmentId(response.shipments[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch shipments:", error);
            // Don't show error toast - shipments might not exist yet
        }
    };

    const fetchTrackingData = async (shipmentId: string) => {
        console.log('[OrderDetailPage] Fetching tracking data for shipment:', shipmentId);
        setTrackingLoading(true);
        try {
            const tracking = await shipperService.getTrackingHistory(shipmentId);
            console.log('[OrderDetailPage] Tracking data received:', {
                shipmentStatus: tracking.shipment?.status,
                eventsCount: tracking.events?.length,
                events: tracking.events?.map(e => ({ status: e.status, statusVi: e.statusVi, time: e.eventTime })),
            });
            setTrackingData(tracking);
            
            // If shipment is in transit or being delivered, fetch location and subscribe to updates
            if (tracking.shipment && isInTransitOrDelivering(tracking.shipment.status)) {
                await fetchShipperLocation(shipmentId);
                subscribeToLocationUpdates(shipmentId);
            } else {
                setShipperLocation(null);
                // Unsubscribe from previous channel
                if (locationChannel) {
                    locationChannel.unsubscribe();
                    setLocationChannel(null);
                }
            }
        } catch (error) {
            console.error("[OrderDetailPage] Failed to fetch tracking:", error);
            setTrackingData(null);
        } finally {
            setTrackingLoading(false);
        }
    };

    const fetchShipperLocation = async (shipmentId: string) => {
        try {
            const location = await shipperService.getShipmentLocation(shipmentId);
            setShipperLocation(location);
        } catch (error: any) {
            // 404 means shipper hasn't updated location yet - this is expected
            if (error?.response?.status === 404) {
                console.log("[OrderDetailPage] Shipper location not available yet");
            } else {
                console.error("Failed to fetch shipper location:", error);
            }
            // Set null to indicate no location available
            setShipperLocation(null);
        }
    };

    // Subscribe to real-time location updates via Supabase Realtime
    const subscribeToLocationUpdates = useCallback((shipmentId: string) => {
        if (!isRealtimeAvailable() || !supabase) {
            console.log("Realtime not available");
            return;
        }

        // Unsubscribe from previous channel
        if (locationChannel) {
            locationChannel.unsubscribe();
        }

        const channel = supabase
            .channel(`shipment-location-${shipmentId}`)
            .on(
                'broadcast',
                { event: 'location_update' },
                (payload) => {
                    const { lat, lng, heading, speed, timestamp } = payload.payload;
                    setShipperLocation(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            shipperLocation: {
                                lat,
                                lng,
                                heading,
                                speed,
                                updatedAt: timestamp,
                            },
                        };
                    });
                }
            )
            .subscribe();

        setLocationChannel(channel);
    }, [locationChannel]);

    const handleRefreshLocation = useCallback(() => {
        if (selectedShipmentId) {
            fetchShipperLocation(selectedShipmentId);
        }
    }, [selectedShipmentId]);

    const handleCancelOrder = async () => {
        if (!cancelReason.trim()) {
            toast.error("Vui lòng nhập lý do hủy đơn");
            return;
        }

        setActionLoading(true);
        try {
            await orderService.cancelOrder(id!, cancelReason);
            toast.success("Đã hủy đơn hàng");
            setShowCancelDialog(false);
            fetchOrder();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể hủy đơn hàng");
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmReceipt = async () => {
        setActionLoading(true);
        try {
            await orderService.confirmReceipt(id!);
            toast.success("Đã xác nhận nhận hàng");
            fetchOrder();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể xác nhận");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayNow = async () => {
        if (!order) return;
        
        setActionLoading(true);
        try {
            const session = await orderService.createPaymentSession(
                order.id,
                order.paymentMethod || 'momo',
                window.location.href
            );
            
            if (session.payUrl) {
                window.location.href = session.payUrl;
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể tạo phiên thanh toán");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCallShipper = () => {
        if (trackingData?.shipper?.maskedPhone) {
            // In a real app, this would initiate a masked call
            toast.info(`Đang kết nối với shipper: ${trackingData.shipper.maskedPhone}`);
        }
    };

    const handleChatShipper = () => {
        if (trackingData?.shipper?.id) {
            // Navigate to chat with shipper
            navigate(`/user/chat?shipperId=${trackingData.shipper.id}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-medium mb-4">Không tìm thấy đơn hàng</h2>
                <Button onClick={() => navigate("/user/purchase")}>Quay lại</Button>
            </div>
        );
    }

    // Get all items from sub-orders
    const allItems = order.subOrders?.flatMap(so => so.items) || [];
    
    // Check if order can be cancelled
    const canCancel = ['pending_payment', 'confirmed'].includes(order.status) &&
        !order.subOrders?.some(so => so.status === 'shipping');
    
    // Check if can confirm receipt
    const canConfirmReceipt = order.subOrders?.some(so => so.status === 'delivered');
    
    // Check if needs payment
    const needsPayment = order.status === 'pending_payment' && order.paymentMethod !== 'cod';
    
    // Check if can review (order completed)
    const canReview = order.status === 'completed' || 
        order.subOrders?.some(so => so.status === 'completed' || so.status === 'delivered');
    
    // Get items for review
    const reviewItems = allItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        imageUrl: item.imageUrl,
    }));

    // Check if can rate shipper (delivered shipments with shipper assigned)
    // Requirements: 15.1 - Prompt customer to rate delivery after completion
    const deliveredShipments = orderShipments.filter(s => s.status === 'delivered' && s.shipper);
    const canRateShipper = deliveredShipments.length > 0;
    
    // Prepare shipments for rating modal
    const shipperRatingShipments: ShipmentRatingInfo[] = deliveredShipments.map(s => ({
        id: s.id,
        trackingNumber: s.trackingNumber,
        shipper: s.shipper ? {
            id: s.shipper.id,
            name: s.shipper.name,
            avatarUrl: s.shipper.avatarUrl,
            vehicleType: s.shipper.vehicleType,
            vehiclePlate: s.shipper.vehiclePlate,
        } : null,
    }));

    // Get selected shipment data
    const selectedShipment = orderShipments.find(s => s.id === selectedShipmentId);
    const showTracking = orderShipments.length > 0;
    // Show map when shipment is in transit or delivering (from picked_up onwards)
    // Map will show even without shipper location - just pickup/delivery markers
    const showMap = selectedShipment && isInTransitOrDelivering(selectedShipment.status);

    // Prepare shipper info for component
    const shipperInfoData: ShipperInfoData | null = trackingData?.shipper ? {
        id: trackingData.shipper.id,
        name: trackingData.shipper.name,
        phone: trackingData.shipper.maskedPhone,
        avatarUrl: trackingData.shipper.avatarUrl,
        rating: trackingData.shipper.rating,
        totalRatings: trackingData.shipper.totalDeliveries,
        vehicleType: trackingData.shipper.vehicleType,
        vehiclePlate: trackingData.shipper.vehiclePlate,
    } : null;

    // Prepare location data for map
    const shipperLocationData: ShipperLocation | null = shipperLocation?.shipperLocation ? {
        lat: shipperLocation.shipperLocation.lat,
        lng: shipperLocation.shipperLocation.lng,
        heading: shipperLocation.shipperLocation.heading,
        speed: shipperLocation.shipperLocation.speed,
        updatedAt: shipperLocation.shipperLocation.updatedAt,
    } : null;

    // Get delivery/pickup addresses from shipperLocation or trackingData
    const deliveryAddress: LocationPoint = {
        lat: shipperLocation?.deliveryLocation?.lat || trackingData?.shipment?.deliveryLat || 0,
        lng: shipperLocation?.deliveryLocation?.lng || trackingData?.shipment?.deliveryLng || 0,
        address: shipperLocation?.deliveryLocation?.address || order.shippingAddress,
    };

    const pickupAddress: LocationPoint = {
        lat: shipperLocation?.pickupLocation?.lat || trackingData?.shipment?.pickupLat || 0,
        lng: shipperLocation?.pickupLocation?.lng || trackingData?.shipment?.pickupLng || 0,
        address: shipperLocation?.pickupLocation?.address || selectedShipment?.pickup?.address || '',
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 flex justify-between items-center rounded-sm shadow-sm">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Quay lại
                </Button>
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Mã đơn hàng: {order.orderNumber}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-shopee-orange font-medium uppercase">
                        {getStatusText(order.status)}
                    </span>
                </div>
            </div>

            {/* Address */}
            <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
                <div className="flex justify-between items-end border-b pb-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xl font-medium">
                            <MapPin className="h-5 w-5 text-shopee-orange" /> Địa chỉ nhận hàng
                        </div>
                        <div className="pl-7">
                            <span className="font-bold">{order.shippingName}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            <span>{order.shippingPhone}</span>
                            <div className="text-gray-500 mt-1">{order.shippingAddress}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tracking Section - Requirements 1.1, 1.3, 12.2 */}
            {showTracking && (
                <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xl font-medium border-b pb-4">
                        <Truck className="h-5 w-5 text-shopee-orange" /> Theo dõi đơn hàng
                    </div>

                    {/* Multi-shipment tabs - Requirements 12.2, 12.5 */}
                    {orderShipments.length > 1 ? (
                        <Tabs 
                            value={selectedShipmentId || undefined} 
                            onValueChange={setSelectedShipmentId}
                            className="w-full"
                        >
                            <TabsList className="w-full justify-start overflow-x-auto">
                                {orderShipments.map((shipment, index) => (
                                    <TabsTrigger 
                                        key={shipment.id} 
                                        value={shipment.id}
                                        className="flex items-center gap-2"
                                    >
                                        <Package className="h-4 w-4" />
                                        <span>
                                            {shipment.shop?.name || `Gói hàng ${index + 1}`}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                            shipment.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                            isDelivering(shipment.status) ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {getStatusText(shipment.status)}
                                        </span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {orderShipments.map((shipment) => (
                                <TabsContent key={shipment.id} value={shipment.id} className="mt-4">
                                    {renderTrackingContent(shipment)}
                                </TabsContent>
                            ))}
                        </Tabs>
                    ) : (
                        // Single shipment - no tabs needed
                        selectedShipment && renderTrackingContent(selectedShipment)
                    )}
                </div>
            )}

            {/* Products */}
            <div className="bg-white p-6 rounded-sm shadow-sm space-y-4">
                <div className="flex items-center gap-2 font-medium border-b pb-4">
                    <div className="flex-1">Sản phẩm</div>
                    <div className="w-32 text-center">Đơn giá</div>
                    <div className="w-20 text-center">SL</div>
                    <div className="w-32 text-center">Thành tiền</div>
                </div>

                <div className="divide-y">
                    {allItems.map(item => (
                        <div key={item.id} className="py-4 flex items-center gap-4">
                            <img 
                                src={item.imageUrl || 'https://placehold.co/100x100?text=Product'} 
                                alt={item.productName} 
                                className="h-20 w-20 object-cover border rounded-sm" 
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm">{item.productName}</h3>
                                {item.variantName && <div className="text-xs text-gray-500">{item.variantName}</div>}
                            </div>
                            <div className="w-32 text-center text-sm">{formatCurrency(item.unitPrice)}</div>
                            <div className="w-20 text-center text-sm">{item.quantity}</div>
                            <div className="w-32 text-center font-medium text-shopee-orange">
                                {formatCurrency(item.totalPrice)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white p-6 rounded-sm shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 font-medium text-lg">
                        <CreditCard className="h-5 w-5" /> Phương thức thanh toán
                    </div>
                    <div className="pl-7 text-sm">
                        {getPaymentMethodText(order.paymentMethod)}
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                            {order.paymentStatus === 'paid' ? 'Đã thanh toán' :
                             order.paymentStatus === 'failed' ? 'Thất bại' :
                             'Chưa thanh toán'}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 text-sm border-l pl-8">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Tổng tiền hàng</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Phí vận chuyển</span>
                        <span>{formatCurrency(order.shippingTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Giảm giá</span>
                        <span>-{formatCurrency(order.discountTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-medium text-shopee-orange pt-4 border-t mt-2">
                        <span>Tổng thanh toán</span>
                        <span>{formatCurrency(order.grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Customer Note */}
            {order.customerNote && (
                <div className="bg-white p-6 rounded-sm shadow-sm">
                    <h3 className="font-medium mb-2">Ghi chú</h3>
                    <p className="text-sm text-gray-600">{order.customerNote}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
                {needsPayment && (
                    <Button 
                        className="bg-shopee-orange hover:bg-shopee-orange-hover text-white"
                        onClick={handlePayNow}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Thanh toán ngay
                    </Button>
                )}
                
                {canCancel && (
                    <Button 
                        variant="outline" 
                        onClick={() => setShowCancelDialog(true)}
                        disabled={actionLoading}
                    >
                        Hủy đơn hàng
                    </Button>
                )}
                
                {canConfirmReceipt && (
                    <Button 
                        className="bg-shopee-orange hover:bg-shopee-orange-hover text-white"
                        onClick={handleConfirmReceipt}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Đã nhận hàng
                    </Button>
                )}
                
                {canReview && (
                    <Button 
                        variant="outline"
                        className="gap-2"
                        onClick={() => setShowReviewModal(true)}
                    >
                        <Star className="h-4 w-4" />
                        Đánh giá sản phẩm
                    </Button>
                )}
                
                {canRateShipper && (
                    <Button 
                        variant="outline"
                        className="gap-2"
                        onClick={() => setShowShipperRatingModal(true)}
                    >
                        <Truck className="h-4 w-4" />
                        Đánh giá shipper
                    </Button>
                )}

                {/* Return Request Button - show for delivered sub-orders */}
                {order.subOrders?.some(so => ['delivered', 'completed'].includes(so.status) && !['return_requested', 'return_approved', 'returned'].includes(so.status)) && (
                    <Button 
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            const deliveredSubOrder = order.subOrders?.find(so => 
                                ['delivered', 'completed'].includes(so.status) && 
                                !['return_requested', 'return_approved', 'returned'].includes(so.status)
                            );
                            if (deliveredSubOrder) {
                                navigate(`/user/returns/request/${order.id}/${deliveredSubOrder.id}`);
                            }
                        }}
                    >
                        <RotateCcw className="h-4 w-4" />
                        Yêu cầu trả hàng
                    </Button>
                )}
                
                <Button variant="outline" onClick={() => navigate("/user/purchase")}>
                    Quay lại
                </Button>
            </div>

            {/* Cancel Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hủy đơn hàng</DialogTitle>
                        <DialogDescription>
                            Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Nhập lý do hủy đơn..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                            Đóng
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleCancelOrder}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Xác nhận hủy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Review Modal */}
            <ReviewModal
                open={showReviewModal}
                onOpenChange={setShowReviewModal}
                items={reviewItems}
                onSuccess={() => toast.success("Cảm ơn bạn đã đánh giá!")}
            />

            {/* Shipper Rating Modal - Requirements 15.1 */}
            <ShipperRatingModal
                open={showShipperRatingModal}
                onOpenChange={setShowShipperRatingModal}
                shipments={shipperRatingShipments}
                onSuccess={() => {
                    toast.success("Cảm ơn bạn đã đánh giá shipper!");
                    // Refresh shipments to update rating status
                    fetchOrderShipments();
                }}
            />
        </div>
    );

    // Helper function to render tracking content for a shipment
    function renderTrackingContent(shipment: OrderShipment) {
        const isCurrentlyDelivering = isDelivering(shipment.status);
        const hasShipper = hasShipperAssigned(shipment.status);

        return (
            <div className="space-y-6">
                {/* Tracking number and status */}
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div>
                        <div className="text-sm text-gray-500">Mã vận đơn</div>
                        <div className="font-mono font-medium">{shipment.trackingNumber}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Trạng thái</div>
                        <div className={`font-medium ${
                            shipment.status === 'delivered' ? 'text-green-600' :
                            isCurrentlyDelivering ? 'text-blue-600' :
                            'text-gray-700'
                        }`}>
                            {shipment.statusLabel || getStatusText(shipment.status)}
                        </div>
                    </div>
                </div>

                {/* ETA Display - when delivering */}
                {isCurrentlyDelivering && shipperLocation?.etaRange && (
                    <ETADisplay
                        etaStart={shipperLocation.etaRange.start}
                        etaEnd={shipperLocation.etaRange.end}
                        distanceKm={shipperLocation.distanceKm || undefined}
                        lastUpdated={shipperLocation.shipperLocation?.updatedAt}
                        isDelivering={true}
                        onLocationUpdate={handleRefreshLocation}
                    />
                )}

                {/* Shipper Info - Requirements 10.1 */}
                {hasShipper && shipperInfoData && (
                    <ShipperInfo
                        shipper={shipperInfoData}
                        canContact={isCurrentlyDelivering}
                        onCall={handleCallShipper}
                        onChat={handleChatShipper}
                    />
                )}

                {/* Map - Requirements 1.3, 4.2 */}
                {/* Show map when in transit - even without shipper location (will show pickup/delivery markers) */}
                {showMap && (deliveryAddress.lat !== 0 || pickupAddress.lat !== 0) && (
                    <ShipperLocationMap
                        shipmentId={shipment.id}
                        initialShipperLocation={shipperLocationData}
                        deliveryAddress={deliveryAddress}
                        pickupAddress={pickupAddress}
                        estimatedArrival={shipperLocation?.etaRange?.display}
                        className="h-[350px]"
                        enableRealtime={true}
                    />
                )}

                {/* Tracking Timeline - Requirements 1.1, 1.4 */}
                {trackingLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-shopee-orange" />
                    </div>
                ) : trackingData?.events && trackingData.events.length > 0 ? (
                    <TrackingTimeline
                        shipmentId={shipment.id}
                        events={trackingData.events}
                        currentStatus={trackingData.shipment?.status || shipment.status}
                        shipperInfo={trackingData.shipper ? {
                            id: trackingData.shipper.id,
                            name: trackingData.shipper.name,
                            phone: trackingData.shipper.maskedPhone,
                            maskedPhone: trackingData.shipper.maskedPhone,
                            avatarUrl: trackingData.shipper.avatarUrl,
                            vehicleType: trackingData.shipper.vehicleType,
                            vehiclePlate: trackingData.shipper.vehiclePlate,
                        } : null}
                    />
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        Chưa có thông tin theo dõi
                    </div>
                )}

                {/* Delivered info - show shipper and delivery photos */}
                {shipment.status === 'delivered' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-green-700 font-medium">Giao hàng thành công</span>
                        </div>
                        
                        {/* Shipper info who delivered */}
                        {shipperInfoData && (
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {shipperInfoData.avatarUrl ? (
                                        <img src={shipperInfoData.avatarUrl} alt={shipperInfoData.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Truck className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{shipperInfoData.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {shipperInfoData.vehicleType} • {shipperInfoData.vehiclePlate}
                                    </div>
                                </div>
                                {shipperInfoData.rating && (
                                    <div className="flex items-center gap-1 text-yellow-500">
                                        <Star className="h-4 w-4 fill-current" />
                                        <span className="text-sm font-medium">{shipperInfoData.rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Delivery proof photos */}
                        {trackingData?.events?.find(e => e.status === 'delivered')?.deliveryPhotoUrls && (
                            <div>
                                <div className="text-sm text-gray-600 mb-2">Ảnh xác nhận giao hàng:</div>
                                <div className="flex gap-2 flex-wrap">
                                    {trackingData.events.find(e => e.status === 'delivered')?.deliveryPhotoUrls?.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                            <img 
                                                src={url} 
                                                alt={`Ảnh giao hàng ${idx + 1}`}
                                                className="h-24 w-24 object-cover rounded-lg border hover:opacity-80 transition-opacity cursor-pointer"
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Rate shipper button */}
                        {shipment.shipper && !shipment.customerRating && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setShowShipperRatingModal(true)}
                            >
                                <Star className="h-4 w-4" />
                                Đánh giá shipper
                            </Button>
                        )}
                    </div>
                )}

                {/* Failed delivery info */}
                {shipment.status === 'failed' && trackingData?.shipment?.failureReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-red-700 font-medium">Giao hàng thất bại</div>
                        <div className="text-red-600 text-sm mt-1">
                            Lý do: {trackingData.shipment.failureReason}
                        </div>
                        {trackingData.shipment.nextDeliveryAttempt && (
                            <div className="text-red-600 text-sm mt-1">
                                Giao lại: {new Date(trackingData.shipment.nextDeliveryAttempt).toLocaleString('vi-VN')}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
}
