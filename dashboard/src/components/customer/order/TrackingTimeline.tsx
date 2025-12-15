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
} from "lucide-react";
import dayjs from "dayjs";

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
}

interface TrackingTimelineProps {
    shipmentId: string;
    events: TrackingEvent[];
    currentStatus: string;
    className?: string;
}

// Map status to icon
function getStatusIcon(status: string) {
    const iconMap: Record<string, React.ReactNode> = {
        created: <Package className="h-4 w-4" />,
        assigned: <User className="h-4 w-4" />,
        picked_up: <Store className="h-4 w-4" />,
        in_transit: <Truck className="h-4 w-4" />,
        out_for_delivery: <Truck className="h-4 w-4" />,
        delivered: <CheckCircle2 className="h-4 w-4" />,
        failed: <XCircle className="h-4 w-4" />,
        returning: <RotateCcw className="h-4 w-4" />,
        returned: <RotateCcw className="h-4 w-4" />,
        cancelled: <XCircle className="h-4 w-4" />,
    };
    return iconMap[status] || <Package className="h-4 w-4" />;
}

// Map status to color
function getStatusColor(status: string, isActive: boolean) {
    if (!isActive) return "bg-gray-200 text-gray-400";
    
    const colorMap: Record<string, string> = {
        created: "bg-blue-500 text-white",
        assigned: "bg-blue-500 text-white",
        picked_up: "bg-blue-500 text-white",
        in_transit: "bg-shopee-orange text-white",
        out_for_delivery: "bg-shopee-orange text-white",
        delivered: "bg-green-500 text-white",
        failed: "bg-red-500 text-white",
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
    events,
    currentStatus,
    className,
}: TrackingTimelineProps) {
    // Sort events by eventTime descending (newest first)
    const sortedEvents = [...events].sort(
        (a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()
    );

    if (sortedEvents.length === 0) {
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
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
