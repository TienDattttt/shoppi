/**
 * ShipmentTrackingPage Component
 * Full tracking page for partner to view shipment details
 * 
 * Requirements: 2.4
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ArrowLeft,
    Package,
    MapPin,
    Phone,
    User,
    Clock,
    Star,
    Bike,
    Car,
    Truck,
    Copy,
    Image as ImageIcon,
    Calendar,
    DollarSign,
    CheckCircle2,
    XCircle,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { TrackingTimeline, type TrackingEvent } from "@/components/customer/order/TrackingTimeline";
import { ShipperLocationMap, type ShipperLocation, type LocationPoint } from "@/components/customer/order/ShipperLocationMap";
import api from "@/services/api";

// Shipment status type
type ShipmentStatus =
    | "created"
    | "assigned"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivering"
    | "delivered"
    | "failed"
    | "returning"
    | "returned"
    | "cancelled";

// Shipper info interface
interface ShipperInfo {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    rating?: number;
    totalDeliveries?: number;
}


// Order item interface
interface OrderItem {
    id: string;
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
}

// Sub-order info interface
interface SubOrderInfo {
    id: string;
    orderId: string;
    total: number;
    status: string;
    items: OrderItem[];
}

// Full shipment detail interface
interface ShipmentDetail {
    id: string;
    trackingNumber: string;
    status: ShipmentStatus;
    statusVi: string;
    
    // Addresses
    pickupAddress: string;
    pickupContactName: string;
    pickupContactPhone: string;
    deliveryAddress: string;
    deliveryContactName: string;
    deliveryContactPhone: string;
    
    // Location
    currentLocationName?: string;
    currentLocationLat?: number;
    currentLocationLng?: number;
    
    // Fees
    shippingFee: number;
    codAmount: number;
    codCollected: boolean;
    codCollectedAt?: string;
    
    // Delivery info
    deliveryAttempts: number;
    deliveryPhotoUrl?: string;
    failureReason?: string;
    
    // Shipper
    shipper: ShipperInfo | null;
    
    // Sub-order
    subOrder: SubOrderInfo;
    
    // Tracking events
    trackingEvents: TrackingEvent[];
    
    // Timestamps
    estimatedPickup?: string;
    estimatedDelivery?: string;
    assignedAt?: string;
    pickedUpAt?: string;
    deliveredAt?: string;
    createdAt: string;
}

// Get status badge style
function getStatusBadgeStyle(status: ShipmentStatus): { className: string } {
    const styleMap: Record<string, { className: string }> = {
        created: { className: "bg-gray-50 text-gray-700 border-gray-200" },
        assigned: { className: "bg-blue-50 text-blue-700 border-blue-200" },
        picked_up: { className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
        in_transit: { className: "bg-purple-50 text-purple-700 border-purple-200" },
        out_for_delivery: { className: "bg-orange-50 text-orange-700 border-orange-200" },
        delivering: { className: "bg-orange-50 text-orange-700 border-orange-200" },
        delivered: { className: "bg-green-50 text-green-700 border-green-200" },
        failed: { className: "bg-red-50 text-red-700 border-red-200" },
        returning: { className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
        returned: { className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
        cancelled: { className: "bg-red-50 text-red-700 border-red-200" },
    };
    return styleMap[status] || { className: "" };
}


// Get status icon
function getStatusIcon(status: ShipmentStatus) {
    const iconMap: Record<string, React.ReactNode> = {
        created: <Package className="h-5 w-5" />,
        assigned: <User className="h-5 w-5" />,
        picked_up: <Package className="h-5 w-5" />,
        in_transit: <Truck className="h-5 w-5" />,
        out_for_delivery: <Truck className="h-5 w-5" />,
        delivering: <Truck className="h-5 w-5" />,
        delivered: <CheckCircle2 className="h-5 w-5" />,
        failed: <XCircle className="h-5 w-5" />,
        returning: <RotateCcw className="h-5 w-5" />,
        returned: <RotateCcw className="h-5 w-5" />,
        cancelled: <XCircle className="h-5 w-5" />,
    };
    return iconMap[status] || <Package className="h-5 w-5" />;
}

// Get vehicle icon
function getVehicleIcon(vehicleType?: string) {
    const type = vehicleType?.toLowerCase() || "";
    if (type.includes("xe máy") || type.includes("motorcycle") || type.includes("bike")) {
        return <Bike className="h-4 w-4" />;
    }
    if (type.includes("ô tô") || type.includes("car")) {
        return <Car className="h-4 w-4" />;
    }
    if (type.includes("xe tải") || type.includes("truck")) {
        return <Truck className="h-4 w-4" />;
    }
    return <Bike className="h-4 w-4" />;
}

// Get initials from name
function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

// Format currency
function formatCurrency(value: number): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
}

// Copy to clipboard
function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
}


export default function ShipmentTrackingPage() {
    const { shipmentId } = useParams<{ shipmentId: string }>();
    const navigate = useNavigate();
    
    const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shipperLocation, setShipperLocation] = useState<ShipperLocation | null>(null);

    useEffect(() => {
        if (shipmentId) {
            loadShipmentDetail();
        }
    }, [shipmentId]);

    const loadShipmentDetail = async () => {
        console.log('[ShipmentTrackingPage] Loading shipment detail:', shipmentId);
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/partner/shipping/shipments/${shipmentId}`);
            console.log('[ShipmentTrackingPage] Raw response:', response.data);
            
            // Handle different response formats
            const shipmentData = response.data?.data?.shipment || response.data?.shipment || response.data;
            
            if (!shipmentData || !shipmentData.id) {
                throw new Error('Invalid shipment data received');
            }
            
            console.log('[ShipmentTrackingPage] Shipment loaded:', {
                id: shipmentData.id,
                status: shipmentData.status,
                trackingEventsCount: shipmentData.trackingEvents?.length,
                trackingEvents: shipmentData.trackingEvents?.map((e: TrackingEvent) => ({
                    status: e.status,
                    statusVi: e.statusVi,
                    time: e.eventTime,
                    location: e.locationName,
                })),
            });
            setShipment(shipmentData);
            
            // If shipment is being delivered, try to get shipper location
            if (["out_for_delivery", "delivering"].includes(shipmentData.status)) {
                loadShipperLocation();
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Không thể tải thông tin vận đơn";
            console.error('[ShipmentTrackingPage] Error loading shipment:', errorMessage, err);
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const loadShipperLocation = async () => {
        try {
            const response = await api.get(`/shipments/${shipmentId}/location`);
            if (response.data.data?.shipperLocation) {
                setShipperLocation(response.data.data.shipperLocation);
            }
        } catch {
            // Location not available, ignore
        }
    };

    if (loading) {
        return <ShipmentTrackingPageSkeleton />;
    }

    if (error || !shipment) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                </Button>
                <Card>
                    <CardContent className="py-12 text-center">
                        <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">{error || "Không tìm thấy thông tin vận đơn"}</p>
                        <Button variant="outline" onClick={loadShipmentDetail} className="mt-4">
                            Thử lại
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const statusStyle = getStatusBadgeStyle(shipment.status);
    const showMap = ["out_for_delivery", "delivering", "in_transit"].includes(shipment.status);
    
    // Prepare location data for map
    const pickupLocation: LocationPoint = {
        lat: 0, // Would need actual coordinates
        lng: 0,
        address: shipment.pickupAddress,
    };
    
    const deliveryLocation: LocationPoint = {
        lat: 0, // Would need actual coordinates
        lng: 0,
        address: shipment.deliveryAddress,
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Chi tiết vận đơn</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-muted-foreground">{shipment.trackingNumber}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(shipment.trackingNumber, "mã vận đơn")}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>
                <Badge variant="outline" className={cn("text-sm py-1 px-3", statusStyle.className)}>
                    {getStatusIcon(shipment.status)}
                    <span className="ml-2">{shipment.statusVi}</span>
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Tracking Timeline & Map */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Map (when delivering) */}
                    {showMap && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    Vị trí shipper
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ShipperLocationMap
                                    shipmentId={shipment.id}
                                    initialShipperLocation={shipperLocation}
                                    deliveryAddress={deliveryLocation}
                                    pickupAddress={pickupLocation}
                                    estimatedArrival={shipment.estimatedDelivery ? dayjs(shipment.estimatedDelivery).format("HH:mm") : undefined}
                                    className="h-[300px]"
                                    enableRealtime={["out_for_delivery", "delivering"].includes(shipment.status)}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Tracking Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Lịch sử vận chuyển
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TrackingTimeline
                                shipmentId={shipment.id}
                                events={shipment.trackingEvents}
                                currentStatus={shipment.status}
                            />
                        </CardContent>
                    </Card>

                    {/* Delivery Proof (when delivered) */}
                    {shipment.deliveryPhotoUrl && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-primary" />
                                    Ảnh xác nhận giao hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative rounded-lg overflow-hidden bg-muted">
                                    <img
                                        src={shipment.deliveryPhotoUrl}
                                        alt="Delivery proof"
                                        className="w-full max-h-[400px] object-contain"
                                    />
                                </div>
                                {shipment.deliveredAt && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Giao lúc: {dayjs(shipment.deliveredAt).format("DD/MM/YYYY HH:mm")}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>


                {/* Right Column - Details */}
                <div className="space-y-6">
                    {/* Shipper Info */}
                    {shipment.shipper && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    Thông tin shipper
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-14 w-14">
                                        <AvatarImage src={shipment.shipper.avatarUrl} alt={shipment.shipper.name} />
                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                            {getInitials(shipment.shipper.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="font-medium">{shipment.shipper.name}</div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            {shipment.shipper.rating && (
                                                <span className="flex items-center gap-0.5">
                                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                    {shipment.shipper.rating.toFixed(1)}
                                                </span>
                                            )}
                                            {shipment.shipper.totalDeliveries && (
                                                <span>• {shipment.shipper.totalDeliveries} đơn</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            {getVehicleIcon(shipment.shipper.vehicleType)}
                                            <span>{shipment.shipper.vehiclePlate}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                            <Phone className="h-3 w-3" />
                                            <span>{shipment.shipper.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Delivery Address */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-green-500" />
                                Địa chỉ giao hàng
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="font-medium">{shipment.deliveryContactName}</div>
                            <div className="text-sm text-muted-foreground">{shipment.deliveryAddress}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{shipment.deliveryContactPhone}</span>
                            </div>
                        </CardContent>
                    </Card>


                    {/* Fees & COD */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" />
                                Phí vận chuyển
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Phí ship</span>
                                <span>{formatCurrency(shipment.shippingFee)}</span>
                            </div>
                            {shipment.codAmount > 0 && (
                                <>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tiền thu hộ (COD)</span>
                                        <span className="font-medium text-amber-600">{formatCurrency(shipment.codAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Trạng thái COD</span>
                                        <Badge variant={shipment.codCollected ? "default" : "secondary"}>
                                            {shipment.codCollected ? "Đã thu" : "Chưa thu"}
                                        </Badge>
                                    </div>
                                    {shipment.codCollectedAt && (
                                        <div className="text-xs text-muted-foreground">
                                            Thu lúc: {dayjs(shipment.codCollectedAt).format("DD/MM/YYYY HH:mm")}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timestamps */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Thời gian
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tạo đơn</span>
                                <span>{dayjs(shipment.createdAt).format("DD/MM/YYYY HH:mm")}</span>
                            </div>
                            {shipment.estimatedPickup && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Dự kiến lấy</span>
                                    <span>{dayjs(shipment.estimatedPickup).format("DD/MM/YYYY HH:mm")}</span>
                                </div>
                            )}
                            {shipment.pickedUpAt && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Đã lấy hàng</span>
                                    <span>{dayjs(shipment.pickedUpAt).format("DD/MM/YYYY HH:mm")}</span>
                                </div>
                            )}
                            {shipment.estimatedDelivery && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Dự kiến giao</span>
                                    <span>{dayjs(shipment.estimatedDelivery).format("DD/MM/YYYY HH:mm")}</span>
                                </div>
                            )}
                            {shipment.deliveredAt && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Đã giao</span>
                                    <span className="text-green-600">{dayjs(shipment.deliveredAt).format("DD/MM/YYYY HH:mm")}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>


                    {/* Order Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                Sản phẩm ({shipment.subOrder.items.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {shipment.subOrder.items.map((item) => (
                                <div key={item.id} className="flex gap-3">
                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.productName}
                                                className="w-full h-full object-cover rounded"
                                            />
                                        ) : (
                                            <Package className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{item.productName}</div>
                                        {item.variantName && (
                                            <div className="text-xs text-muted-foreground">{item.variantName}</div>
                                        )}
                                        <div className="text-xs text-muted-foreground">
                                            {formatCurrency(item.unitPrice)} x {item.quantity}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="border-t pt-3 flex justify-between font-medium">
                                <span>Tổng cộng</span>
                                <span className="text-primary">{formatCurrency(shipment.subOrder.total)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Failure Reason (if failed) */}
                    {shipment.failureReason && (
                        <Card className="border-red-200 bg-red-50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                                    <XCircle className="h-5 w-5" />
                                    Lý do thất bại
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-red-600">{shipment.failureReason}</p>
                                {shipment.deliveryAttempts > 0 && (
                                    <p className="text-xs text-red-500 mt-2">
                                        Số lần giao: {shipment.deliveryAttempts}/3
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

// Loading skeleton
function ShipmentTrackingPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-24" />
                <div>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32 mt-2" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-[300px] rounded-lg" />
                    <Skeleton className="h-[400px] rounded-lg" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-[200px] rounded-lg" />
                    <Skeleton className="h-[150px] rounded-lg" />
                    <Skeleton className="h-[200px] rounded-lg" />
                </div>
            </div>
        </div>
    );
}
