import { useEffect, useState } from "react";
import { Clock, MapPin, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

interface ETADisplayProps {
    /** Estimated arrival time as ISO string or time range string */
    estimatedArrival?: string;
    /** Start of time range (e.g., "14:00") */
    etaStart?: string;
    /** End of time range (e.g., "15:00") */
    etaEnd?: string;
    /** Distance in kilometers */
    distanceKm?: number;
    /** Last update timestamp */
    lastUpdated?: string;
    /** Whether the shipper is currently delivering */
    isDelivering?: boolean;
    /** Callback when location updates */
    onLocationUpdate?: () => void;
    className?: string;
}

/**
 * Format ETA as time range (e.g., "14:00 - 15:00")
 * Per Requirements 14.5: Display time range rather than exact time
 */
function formatETARange(etaStart?: string, etaEnd?: string, estimatedArrival?: string): string {
    // If we have explicit start/end times, use them
    if (etaStart && etaEnd) {
        return `${etaStart} - ${etaEnd}`;
    }

    // If we have an estimated arrival time, create a range around it
    if (estimatedArrival) {
        const eta = dayjs(estimatedArrival);
        if (eta.isValid()) {
            // Create a 30-minute window around the ETA
            const start = eta.subtract(15, "minute");
            const end = eta.add(15, "minute");
            return `${start.format("HH:mm")} - ${end.format("HH:mm")}`;
        }
        // If it's already a formatted time range string, return as-is
        return estimatedArrival;
    }

    return "Đang tính toán...";
}

/**
 * Format distance for display
 */
function formatDistance(distanceKm?: number): string {
    if (!distanceKm) return "";
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
}

/**
 * Format last updated time
 */
function formatLastUpdated(lastUpdated?: string): string {
    if (!lastUpdated) return "";
    const updated = dayjs(lastUpdated);
    const now = dayjs();
    const diffSeconds = now.diff(updated, "second");

    if (diffSeconds < 60) {
        return "Vừa cập nhật";
    }
    if (diffSeconds < 3600) {
        return `${Math.floor(diffSeconds / 60)} phút trước`;
    }
    return updated.format("HH:mm");
}

export function ETADisplay({
    estimatedArrival,
    etaStart,
    etaEnd,
    distanceKm,
    lastUpdated,
    isDelivering = false,
    onLocationUpdate,
    className,
}: ETADisplayProps) {
    const [lastUpdatedText, setLastUpdatedText] = useState(formatLastUpdated(lastUpdated));

    // Update the "last updated" text periodically
    useEffect(() => {
        if (!lastUpdated) return;

        const interval = setInterval(() => {
            setLastUpdatedText(formatLastUpdated(lastUpdated));
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [lastUpdated]);

    // Update immediately when lastUpdated changes
    useEffect(() => {
        setLastUpdatedText(formatLastUpdated(lastUpdated));
    }, [lastUpdated]);

    const etaRange = formatETARange(etaStart, etaEnd, estimatedArrival);
    const distance = formatDistance(distanceKm);

    return (
        <div
            className={cn(
                "bg-gradient-to-r from-shopee-orange/10 to-orange-50 rounded-lg p-4 border border-shopee-orange/20",
                className
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-shopee-orange/20 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-shopee-orange" />
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">
                            {isDelivering ? "Dự kiến giao hàng" : "Thời gian giao hàng dự kiến"}
                        </div>
                        <div className="text-xl font-semibold text-shopee-orange">
                            {etaRange}
                        </div>
                    </div>
                </div>

                {/* Distance info */}
                {distance && isDelivering && (
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>Còn {distance}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Last updated and refresh */}
            {isDelivering && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-shopee-orange/10">
                    <div className="text-xs text-muted-foreground">
                        {lastUpdatedText && `Cập nhật: ${lastUpdatedText}`}
                    </div>
                    {onLocationUpdate && (
                        <button
                            onClick={onLocationUpdate}
                            className="flex items-center gap-1 text-xs text-shopee-orange hover:text-shopee-orange-hover transition-colors"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Làm mới
                        </button>
                    )}
                </div>
            )}

            {/* Delivery status indicator */}
            {isDelivering && (
                <div className="flex items-center gap-2 mt-3">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">
                        Shipper đang trên đường giao hàng
                    </span>
                </div>
            )}
        </div>
    );
}
