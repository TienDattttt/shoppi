/**
 * ShipmentStatusCard Component
 * Displays shipment status with icon, shipper info, tracking number, and action buttons
 * 
 * Requirements: 2.1, 2.4
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Package,
    Truck,
    CheckCircle2,
    XCircle,
    User,
    MapPin,
    Clock,
    Phone,
    Eye,
    Calendar,
    Star,
    Bike,
    Car,
    RotateCcw,
    Copy,
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";

// Shipment status type
export type ShipmentStatus =
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
export interface ShipperInfo {
    id: string;
    name: string;
    phone: string; // Masked phone
    avatarUrl?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    rating?: number;
}

// Sub-order info interface
export interface SubOrderInfo {
    id: string;
    orderId: string;
    total: number;
    status: string;
    itemCount: number;
}


// Tracking event interface
export interface TrackingEventInfo {
    id: string;
    status: string;
    statusVi: string;
    description?: string;
    descriptionVi?: string;
    locationName?: string;
    eventTime: string;
}

// Shipment data interface
export interface ShipmentData {
    id: string;
    trackingNumber: string;
    status: ShipmentStatus;
    statusVi: string;
    pickupAddress: string;
    deliveryAddress: string;
    deliveryContactName: string;
    deliveryContactPhone: string;
    shippingFee: number;
    codAmount: number;
    codCollected: boolean;
    shipper: ShipperInfo | null;
    subOrder: SubOrderInfo;
    trackingEvents?: TrackingEventInfo[];
    estimatedPickup?: string;
    estimatedDelivery?: string;
    assignedAt?: string;
    pickedUpAt?: string;
    deliveredAt?: string;
    createdAt: string;
}

interface ShipmentStatusCardProps {
    shipment: ShipmentData;
    onViewTracking: (shipmentId: string) => void;
    onRequestPickup: (shipmentId: string) => void;
    className?: string;
}

// Get status icon
function getStatusIcon(status: ShipmentStatus) {
    const iconMap: Record<string, React.ReactNode> = {
        created: <Package className="h-4 w-4" />,
        assigned: <User className="h-4 w-4" />,
        picked_up: <Package className="h-4 w-4" />,
        in_transit: <Truck className="h-4 w-4" />,
        out_for_delivery: <Truck className="h-4 w-4" />,
        delivering: <Truck className="h-4 w-4" />,
        delivered: <CheckCircle2 className="h-4 w-4" />,
        failed: <XCircle className="h-4 w-4" />,
        returning: <RotateCcw className="h-4 w-4" />,
        returned: <RotateCcw className="h-4 w-4" />,
        cancelled: <XCircle className="h-4 w-4" />,
    };
    return iconMap[status] || <Package className="h-4 w-4" />;
}

// Get status badge variant and color
function getStatusBadgeStyle(status: ShipmentStatus): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } {
    const styleMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
        created: { variant: "outline", className: "bg-gray-50 text-gray-700 border-gray-200" },
        assigned: { variant: "outline", className: "bg-blue-50 text-blue-700 border-blue-200" },
        picked_up: { variant: "outline", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
        in_transit: { variant: "outline", className: "bg-purple-50 text-purple-700 border-purple-200" },
        out_for_delivery: { variant: "outline", className: "bg-orange-50 text-orange-700 border-orange-200" },
        delivering: { variant: "outline", className: "bg-orange-50 text-orange-700 border-orange-200" },
        delivered: { variant: "outline", className: "bg-green-50 text-green-700 border-green-200" },
        failed: { variant: "outline", className: "bg-red-50 text-red-700 border-red-200" },
        returning: { variant: "outline", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
        returned: { variant: "outline", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
        cancelled: { variant: "outline", className: "bg-red-50 text-red-700 border-red-200" },
    };
    return styleMap[status] || { variant: "outline", className: "" };
}


// Get vehicle icon
function getVehicleIcon(vehicleType?: string) {
    const type = vehicleType?.toLowerCase() || "";
    if (type.includes("xe máy") || type.includes("motorcycle") || type.includes("bike")) {
        return <Bike className="h-3 w-3" />;
    }
    if (type.includes("ô tô") || type.includes("car")) {
        return <Car className="h-3 w-3" />;
    }
    if (type.includes("xe tải") || type.includes("truck")) {
        return <Truck className="h-3 w-3" />;
    }
    return <Bike className="h-3 w-3" />;
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

// Copy tracking number to clipboard
function copyTrackingNumber(trackingNumber: string) {
    navigator.clipboard.writeText(trackingNumber);
    toast.success("Đã sao chép mã vận đơn");
}

export function ShipmentStatusCard({
    shipment,
    onViewTracking,
    onRequestPickup,
    className,
}: ShipmentStatusCardProps) {
    const statusStyle = getStatusBadgeStyle(shipment.status);
    const canRequestPickup = ["created", "assigned"].includes(shipment.status);
    const latestEvent = shipment.trackingEvents?.[0];

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardContent className="p-4">
                {/* Header: Status and Tracking Number */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full",
                            statusStyle.className
                        )}>
                            {getStatusIcon(shipment.status)}
                        </div>
                        <div>
                            <Badge variant={statusStyle.variant} className={statusStyle.className}>
                                {shipment.statusVi}
                            </Badge>
                            {shipment.codAmount > 0 && (
                                <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                                    COD: {formatCurrency(shipment.codAmount)}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                        <span className="font-mono text-muted-foreground">{shipment.trackingNumber}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyTrackingNumber(shipment.trackingNumber)}
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                </div>


                {/* Delivery Info */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{shipment.deliveryContactName}</div>
                            <div className="text-muted-foreground truncate">{shipment.deliveryAddress}</div>
                            <div className="text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {shipment.deliveryContactPhone}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shipper Info (when assigned) */}
                {shipment.shipper && (
                    <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={shipment.shipper.avatarUrl} alt={shipment.shipper.name} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                    {getInitials(shipment.shipper.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{shipment.shipper.name}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {shipment.shipper.rating && (
                                        <span className="flex items-center gap-0.5">
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            {shipment.shipper.rating.toFixed(1)}
                                        </span>
                                    )}
                                    {shipment.shipper.vehicleType && (
                                        <span className="flex items-center gap-0.5">
                                            {getVehicleIcon(shipment.shipper.vehicleType)}
                                            {shipment.shipper.vehiclePlate}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {shipment.shipper.phone}
                            </div>
                        </div>
                    </div>
                )}

                {/* Estimated Times */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                    {shipment.estimatedPickup && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Lấy hàng: {dayjs(shipment.estimatedPickup).format("DD/MM HH:mm")}</span>
                        </div>
                    )}
                    {shipment.estimatedDelivery && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Giao hàng: {dayjs(shipment.estimatedDelivery).format("DD/MM HH:mm")}</span>
                        </div>
                    )}
                    {!shipment.estimatedPickup && !shipment.estimatedDelivery && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Tạo lúc: {dayjs(shipment.createdAt).format("DD/MM/YYYY HH:mm")}</span>
                        </div>
                    )}
                </div>


                {/* Latest Tracking Event */}
                {latestEvent && (
                    <div className="bg-blue-50 rounded-lg p-2 mb-4 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="font-medium text-blue-700">{latestEvent.statusVi}</span>
                            <span className="text-blue-600">
                                {dayjs(latestEvent.eventTime).format("DD/MM HH:mm")}
                            </span>
                        </div>
                        {latestEvent.descriptionVi && (
                            <div className="ml-3.5 text-blue-600 mt-0.5">{latestEvent.descriptionVi}</div>
                        )}
                    </div>
                )}

                {/* Order Summary */}
                <div className="flex items-center justify-between text-sm border-t pt-3 mb-3">
                    <span className="text-muted-foreground">
                        {shipment.subOrder.itemCount} sản phẩm
                    </span>
                    <span className="font-medium text-primary">
                        {formatCurrency(shipment.subOrder.total)}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => onViewTracking(shipment.id)}
                    >
                        <Eye className="h-4 w-4" />
                        Xem chi tiết
                    </Button>
                    {canRequestPickup && (
                        <Button
                            variant="default"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => onRequestPickup(shipment.id)}
                        >
                            <Truck className="h-4 w-4" />
                            Yêu cầu lấy hàng
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
