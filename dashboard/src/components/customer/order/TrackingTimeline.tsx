import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Package,
    Truck,
    CheckCircle2,
    XCircle,
    MapPin,
    Clock,
    User,
    Store,
    RotateCcw,
    Building2,
    Warehouse,
    ArrowRight,
    Phone,
    Image,
} from "lucide-react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export interface TrackingEvent {
    id: string;
    status: string;
    statusVi: string;
    description: string;
    descriptionVi: string;
    locationName?: string;
    locationAddress?: string;
    lat?: number;
    lng?: number;
    actorType: "system" | "shipper" | "shop" | "customer";
    actorId?: string;
    actorName?: string;
    eventTime: string;
    // Delivery proof photos (for delivered status)
    deliveryPhotoUrls?: string[];
}

export interface ShipperContactInfo {
    id: string;
    name: string;
    phone?: string;
    maskedPhone?: string;
    avatarUrl?: string;
    vehicleType?: string;
    vehiclePlate?: string;
}

interface TrackingTimelineProps {
    shipmentId: string;
    events: TrackingEvent[];
    currentStatus: string;
    className?: string;
    // Shipper info for contact button
    shipperInfo?: ShipperContactInfo | null;
}

// Map status to icon - including transit simulation statuses
function getStatusIcon(status: string) {
    const iconMap: Record<string, React.ReactNode> = {
        // Order creation
        order_placed: <Package className="h-4 w-4" />,
        shop_confirmed: <Store className="h-4 w-4" />,
        shop_packed: <Package className="h-4 w-4" />,
        ready_to_ship: <Package className="h-4 w-4" />,
        pickup_requested: <Package className="h-4 w-4" />,
        
        // Pickup phase
        created: <Package className="h-4 w-4" />,
        assigned: <User className="h-4 w-4" />,
        shipper_assigned: <User className="h-4 w-4" />,
        picked_up: <Store className="h-4 w-4" />,
        
        // Transit simulation - post offices
        arrived_pickup_office: <Building2 className="h-4 w-4" />,
        left_pickup_office: <ArrowRight className="h-4 w-4" />,
        
        // Transit simulation - sorting hubs
        arrived_sorting_hub: <Warehouse className="h-4 w-4" />,
        left_sorting_hub: <ArrowRight className="h-4 w-4" />,
        
        // Transit simulation - delivery office
        arrived_delivery_office: <Building2 className="h-4 w-4" />,
        delivery_shipper_assigned: <User className="h-4 w-4" />,
        ready_for_delivery: <Package className="h-4 w-4" />,
        
        // Delivery phase
        in_transit: <Truck className="h-4 w-4" />,
        out_for_delivery: <Truck className="h-4 w-4" />,
        delivering: <Truck className="h-4 w-4" />,
        delivered: <CheckCircle2 className="h-4 w-4" />,
        
        // Special statuses
        failed: <XCircle className="h-4 w-4" />,
        delivery_failed: <XCircle className="h-4 w-4" />,
        returning: <RotateCcw className="h-4 w-4" />,
        returned: <RotateCcw className="h-4 w-4" />,
        cancelled: <XCircle className="h-4 w-4" />,
    };
    return iconMap[status] || <Package className="h-4 w-4" />;
}

// Map status to color - including transit simulation statuses
function getStatusColor(status: string, isActive: boolean) {
    if (!isActive) return "bg-gray-200 text-gray-400";
    
    const colorMap: Record<string, string> = {
        // Order creation - blue
        order_placed: "bg-blue-500 text-white",
        shop_confirmed: "bg-blue-500 text-white",
        shop_packed: "bg-blue-500 text-white",
        ready_to_ship: "bg-blue-500 text-white",
        pickup_requested: "bg-blue-500 text-white",
        
        // Pickup phase - blue
        created: "bg-blue-500 text-white",
        assigned: "bg-blue-500 text-white",
        shipper_assigned: "bg-blue-500 text-white",
        picked_up: "bg-blue-500 text-white",
        
        // Transit simulation - purple (post offices & hubs)
        arrived_pickup_office: "bg-purple-500 text-white",
        left_pickup_office: "bg-purple-500 text-white",
        arrived_sorting_hub: "bg-indigo-500 text-white",
        left_sorting_hub: "bg-indigo-500 text-white",
        arrived_delivery_office: "bg-purple-500 text-white",
        delivery_shipper_assigned: "bg-blue-500 text-white",
        ready_for_delivery: "bg-blue-500 text-white",
        
        // Delivery phase - orange
        in_transit: "bg-shopee-orange text-white",
        out_for_delivery: "bg-shopee-orange text-white",
        delivering: "bg-shopee-orange text-white",
        
        // Success - green
        delivered: "bg-green-500 text-white",
        
        // Failed/Return - red/yellow
        failed: "bg-red-500 text-white",
        delivery_failed: "bg-red-500 text-white",
        returning: "bg-yellow-500 text-white",
        returned: "bg-yellow-500 text-white",
        cancelled: "bg-red-500 text-white",
    };
    return colorMap[status] || "bg-gray-500 text-white";
}

// Map actor type to Vietnamese label
function getActorLabel(actorType: string): string {
    const labelMap: Record<string, string> = {
        system: "Hệ thống",
        shipper: "Shipper",
        shop: "Shop",
        customer: "Khách hàng",
    };
    return labelMap[actorType] || actorType;
}

export function TrackingTimeline({
    shipmentId,
    events,
    currentStatus,
    className,
    shipperInfo,
}: TrackingTimelineProps) {
    // State for dialogs
    const [showContactDialog, setShowContactDialog] = useState(false);
    const [showPhotosDialog, setShowPhotosDialog] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

    // Debug log
    console.log('[TrackingTimeline] Rendering for shipment:', shipmentId);
    console.log('[TrackingTimeline] Current status:', currentStatus);
    console.log('[TrackingTimeline] Events count:', events.length);
    console.log('[TrackingTimeline] Events:', events.map(e => ({
        status: e.status,
        statusVi: e.statusVi,
        time: e.eventTime,
        location: e.locationName,
    })));

    // Sort events by eventTime descending (newest first)
    const sortedEvents = [...events].sort(
        (a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()
    );

    // Get delivery photos from delivered event
    const deliveredEvent = sortedEvents.find(e => e.status === 'delivered');
    const deliveryPhotos = deliveredEvent?.deliveryPhotoUrls || [];

    if (sortedEvents.length === 0) {
        console.log('[TrackingTimeline] No events to display');
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                Chưa có thông tin theo dõi
            </div>
        );
    }

    return (
        <div className={cn("relative", className)}>
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Events */}
            <div className="space-y-6">
                {sortedEvents.map((event, index) => {
                    const isLatest = index === 0;
                    const isActive = isLatest || event.status === currentStatus;

                    return (
                        <div key={event.id} className="relative flex gap-4">
                            {/* Icon circle */}
                            <div
                                className={cn(
                                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                                    getStatusColor(event.status, isActive)
                                )}
                            >
                                {getStatusIcon(event.status)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-2">
                                {/* Status label */}
                                <div
                                    className={cn(
                                        "font-medium",
                                        isActive ? "text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {event.statusVi || event.status}
                                </div>

                                {/* Description */}
                                <div
                                    className={cn(
                                        "text-sm mt-1",
                                        isActive ? "text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {event.descriptionVi || event.description}
                                </div>

                                {/* Location info */}
                                {event.locationName && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                                        <MapPin className="h-3 w-3" />
                                        <span>{event.locationName}</span>
                                        {event.locationAddress && (
                                            <span className="text-gray-400">
                                                - {event.locationAddress}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Timestamp and actor */}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {dayjs(event.eventTime).format("DD/MM/YYYY HH:mm")}
                                        </span>
                                    </div>
                                    {event.actorName && (
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span>
                                                {getActorLabel(event.actorType)}: {event.actorName}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Delivery action buttons - Requirements 7.1 */}
                                {event.status === 'delivered' && (
                                    <div className="mt-3 flex gap-2">
                                        {/* Contact button */}
                                        {shipperInfo && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => setShowContactDialog(true)}
                                            >
                                                <Phone className="h-4 w-4" />
                                                Liên hệ
                                            </Button>
                                        )}
                                        
                                        {/* Photos button */}
                                        {event.deliveryPhotoUrls && event.deliveryPhotoUrls.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => {
                                                    setSelectedPhotoIndex(0);
                                                    setShowPhotosDialog(true);
                                                }}
                                            >
                                                <Image className="h-4 w-4" />
                                                Hình ảnh ({event.deliveryPhotoUrls.length})
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Contact Dialog */}
            <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Thông tin Shipper</DialogTitle>
                    </DialogHeader>
                    {shipperInfo && (
                        <div className="space-y-4">
                            {/* Shipper avatar and name */}
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {shipperInfo.avatarUrl ? (
                                        <img 
                                            src={shipperInfo.avatarUrl} 
                                            alt={shipperInfo.name} 
                                            className="h-full w-full object-cover" 
                                        />
                                    ) : (
                                        <Truck className="h-8 w-8 text-gray-400" />
                                    )}
                                </div>
                                <div>
                                    <div className="font-medium text-lg">{shipperInfo.name}</div>
                                    {shipperInfo.vehicleType && (
                                        <div className="text-sm text-muted-foreground">
                                            {shipperInfo.vehicleType}
                                            {shipperInfo.vehiclePlate && ` • ${shipperInfo.vehiclePlate}`}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Phone number */}
                            {(shipperInfo.phone || shipperInfo.maskedPhone) && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-sm text-muted-foreground mb-1">Số điện thoại</div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-lg">
                                            {shipperInfo.phone || shipperInfo.maskedPhone}
                                        </span>
                                        <a 
                                            href={`tel:${shipperInfo.phone || shipperInfo.maskedPhone}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                        >
                                            <Phone className="h-4 w-4" />
                                            Gọi ngay
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Photos Dialog */}
            <Dialog open={showPhotosDialog} onOpenChange={setShowPhotosDialog}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Ảnh xác nhận giao hàng</DialogTitle>
                    </DialogHeader>
                    {deliveryPhotos.length > 0 && (
                        <div className="space-y-4">
                            {/* Main photo */}
                            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                    src={deliveryPhotos[selectedPhotoIndex]}
                                    alt={`Ảnh giao hàng ${selectedPhotoIndex + 1}`}
                                    className="w-full h-full object-contain"
                                />
                                {/* Photo counter */}
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-sm px-2 py-1 rounded">
                                    {selectedPhotoIndex + 1} / {deliveryPhotos.length}
                                </div>
                            </div>

                            {/* Thumbnail navigation */}
                            {deliveryPhotos.length > 1 && (
                                <div className="flex gap-2 justify-center">
                                    {deliveryPhotos.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedPhotoIndex(idx)}
                                            className={cn(
                                                "h-16 w-16 rounded-lg overflow-hidden border-2 transition-all",
                                                selectedPhotoIndex === idx 
                                                    ? "border-shopee-orange ring-2 ring-shopee-orange/30" 
                                                    : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <img
                                                src={url}
                                                alt={`Thumbnail ${idx + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* View full size link */}
                            <div className="text-center">
                                <a
                                    href={deliveryPhotos[selectedPhotoIndex]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-shopee-orange hover:underline"
                                >
                                    Xem ảnh gốc
                                </a>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
