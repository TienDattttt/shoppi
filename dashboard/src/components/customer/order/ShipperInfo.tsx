import { Phone, MessageSquare, Star, Bike, Car, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface ShipperInfoData {
    id: string;
    name: string;
    phone: string; // Masked: 090****123
    avatarUrl?: string;
    rating: number;
    totalRatings?: number;
    vehicleType: string;
    vehiclePlate: string;
}

interface ShipperInfoProps {
    shipper: ShipperInfoData;
    canContact: boolean;
    onCall: () => void;
    onChat: () => void;
    className?: string;
}

// Get vehicle icon based on type
function getVehicleIcon(vehicleType: string) {
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

export function ShipperInfo({
    shipper,
    canContact,
    onCall,
    onChat,
    className,
}: ShipperInfoProps) {
    return (
        <div className={cn("bg-white rounded-lg border p-4", className)}>
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <Avatar className="h-14 w-14">
                    <AvatarImage src={shipper.avatarUrl} alt={shipper.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                        {getInitials(shipper.name)}
                    </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-base truncate">{shipper.name}</h3>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{shipper.rating.toFixed(1)}</span>
                        {shipper.totalRatings !== undefined && (
                            <span className="text-xs text-muted-foreground">
                                ({shipper.totalRatings} đánh giá)
                            </span>
                        )}
                    </div>

                    {/* Vehicle info */}
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        {getVehicleIcon(shipper.vehicleType)}
                        <span>{shipper.vehicleType}</span>
                        <span className="text-gray-300">|</span>
                        <span className="font-mono">{shipper.vehiclePlate}</span>
                    </div>

                    {/* Masked phone */}
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{shipper.phone}</span>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            {canContact && (
                <div className="flex gap-2 mt-4">
                    <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={onCall}
                    >
                        <Phone className="h-4 w-4" />
                        Gọi điện
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={onChat}
                    >
                        <MessageSquare className="h-4 w-4" />
                        Nhắn tin
                    </Button>
                </div>
            )}

            {!canContact && (
                <div className="mt-4 text-xs text-center text-muted-foreground bg-gray-50 rounded py-2">
                    Liên hệ shipper chỉ khả dụng khi đơn hàng đang được giao
                </div>
            )}
        </div>
    );
}
