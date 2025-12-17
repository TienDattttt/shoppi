import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { useShipperTracking } from "@/hooks/useShipperTracking";
import { shipperService, type RouteResponse } from "@/services/shipper.service";

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-expect-error - Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

export interface ShipperLocation {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    updatedAt: string;
}

export interface LocationPoint {
    lat: number;
    lng: number;
    address: string;
}

interface ShipperLocationMapProps {
    shipmentId: string;
    initialShipperLocation?: ShipperLocation | null;
    deliveryAddress: LocationPoint;
    pickupAddress: LocationPoint;
    estimatedArrival?: string;
    className?: string;
    enableRealtime?: boolean; // Enable real-time tracking via Socket.io
}

// Custom shipper icon (blue motorcycle)
const shipperIcon = new L.DivIcon({
    className: "shipper-marker",
    html: `
        <div class="relative">
            <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="18.5" cy="17.5" r="3.5"/>
                    <circle cx="5.5" cy="17.5" r="3.5"/>
                    <circle cx="15" cy="5" r="1"/>
                    <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                </svg>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-blue-500"></div>
        </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
});

// Pickup icon (orange)
const pickupIcon = new L.DivIcon({
    className: "pickup-marker",
    html: `
        <div class="relative">
            <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                    <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
                    <path d="M12 3v6"/>
                </svg>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-6 border-l-transparent border-r-transparent border-t-orange-500"></div>
        </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
});

// Delivery icon (green)
const deliveryIcon = new L.DivIcon({
    className: "delivery-marker",
    html: `
        <div class="relative">
            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-6 border-l-transparent border-r-transparent border-t-green-500"></div>
        </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
});

// Component to auto-fit bounds when locations change
function MapBoundsUpdater({
    shipperLocation,
    deliveryAddress,
    pickupAddress,
    followShipper = false,
}: {
    shipperLocation: ShipperLocation | null;
    deliveryAddress: LocationPoint;
    pickupAddress: LocationPoint;
    followShipper?: boolean;
}) {
    const map = useMap();
    const hasSetBounds = useRef(false);
    const lastShipperPos = useRef<string>("");

    // Initial bounds setup
    useEffect(() => {
        if (hasSetBounds.current) return;
        
        const points: L.LatLngExpression[] = [];
        
        if (deliveryAddress.lat && deliveryAddress.lng) {
            points.push([deliveryAddress.lat, deliveryAddress.lng]);
        }
        if (pickupAddress.lat && pickupAddress.lng) {
            points.push([pickupAddress.lat, pickupAddress.lng]);
        }
        if (shipperLocation) {
            points.push([shipperLocation.lat, shipperLocation.lng]);
        }

        if (points.length >= 2) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50] });
            hasSetBounds.current = true;
        }
    }, [map, deliveryAddress, pickupAddress]);

    // Follow shipper when location updates (smooth pan)
    useEffect(() => {
        if (!shipperLocation) return;
        
        const posKey = `${shipperLocation.lat.toFixed(4)},${shipperLocation.lng.toFixed(4)}`;
        if (posKey === lastShipperPos.current) return;
        lastShipperPos.current = posKey;
        
        // If followShipper is enabled, pan to shipper location
        if (followShipper) {
            map.panTo([shipperLocation.lat, shipperLocation.lng], { animate: true, duration: 0.5 });
        } else {
            // Just ensure shipper is visible in current view
            const bounds = map.getBounds();
            if (!bounds.contains([shipperLocation.lat, shipperLocation.lng])) {
                // Shipper moved out of view, fit bounds to include shipper and delivery
                const newBounds = L.latLngBounds([
                    [shipperLocation.lat, shipperLocation.lng],
                    [deliveryAddress.lat, deliveryAddress.lng],
                ]);
                map.fitBounds(newBounds, { padding: [50, 50], animate: true });
            }
        }
    }, [map, shipperLocation, deliveryAddress, followShipper]);

    return null;
}

export function ShipperLocationMap({
    shipmentId,
    initialShipperLocation,
    deliveryAddress,
    pickupAddress,
    estimatedArrival,
    className,
    enableRealtime = true,
}: ShipperLocationMapProps) {
    // Use real-time tracking if enabled
    const { shipperLocation: realtimeLocation, isConnected } = useShipperTracking(
        enableRealtime ? shipmentId : null
    );
    
    // Route state
    const [routeData, setRouteData] = useState<RouteResponse | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const lastRouteOriginRef = useRef<string>("");
    const [followShipper, setFollowShipper] = useState(false);
    
    // Use realtime location if available, otherwise fall back to initial
    const shipperLocation: ShipperLocation | null = realtimeLocation ?? initialShipperLocation ?? null;
    
    // Default center (Vietnam - Ho Chi Minh City)
    const defaultCenter: L.LatLngExpression = [10.8231, 106.6297];

    // Fetch route from Goong Directions API
    const fetchRoute = useCallback(async (fromShipper: boolean = false) => {
        if (!shipmentId) return;
        
        // Create a key to check if we need to refetch
        const originKey = fromShipper && shipperLocation 
            ? `${shipperLocation.lat.toFixed(4)},${shipperLocation.lng.toFixed(4)}`
            : `${pickupAddress.lat.toFixed(4)},${pickupAddress.lng.toFixed(4)}`;
        
        // Don't refetch if origin hasn't changed significantly
        if (lastRouteOriginRef.current === originKey && routeData) return;
        
        setRouteLoading(true);
        try {
            const data = await shipperService.getShipmentRoute(shipmentId, fromShipper);
            setRouteData(data);
            lastRouteOriginRef.current = originKey;
        } catch (error) {
            console.error("[ShipperLocationMap] Failed to fetch route:", error);
        } finally {
            setRouteLoading(false);
        }
    }, [shipmentId, shipperLocation, pickupAddress, routeData]);

    // Fetch route on mount and when shipper location changes significantly
    useEffect(() => {
        // Fetch route from shipper if available, otherwise from pickup
        const hasShipper = !!shipperLocation;
        fetchRoute(hasShipper);
    }, [shipmentId]); // Only on mount

    // Update route when shipper moves significantly (every 500m)
    useEffect(() => {
        if (!shipperLocation || !routeData) return;
        
        const currentOrigin = routeData.origin;
        const distance = calculateDistance(
            shipperLocation.lat, shipperLocation.lng,
            currentOrigin.lat, currentOrigin.lng
        );
        
        // Refetch route if shipper moved more than 500m
        if (distance > 0.5) {
            fetchRoute(true);
        }
    }, [shipperLocation?.lat, shipperLocation?.lng]);

    // Calculate distance between two points (km)
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    // Calculate center based on available locations
    const getCenter = (): L.LatLngExpression => {
        if (shipperLocation) {
            return [shipperLocation.lat, shipperLocation.lng];
        }
        if (deliveryAddress.lat && deliveryAddress.lng) {
            return [deliveryAddress.lat, deliveryAddress.lng];
        }
        return defaultCenter;
    };

    // Convert route polyline points to Leaflet format
    const routePositions: L.LatLngExpression[] = routeData?.route?.polylinePoints?.map(
        p => [p.lat, p.lng] as L.LatLngExpression
    ) || [];
    
    // Fallback to straight line if no route
    if (routePositions.length === 0) {
        if (shipperLocation) {
            routePositions.push([shipperLocation.lat, shipperLocation.lng]);
        }
        if (deliveryAddress.lat && deliveryAddress.lng) {
            routePositions.push([deliveryAddress.lat, deliveryAddress.lng]);
        }
    }

    return (
        <div className={cn("relative rounded-lg overflow-hidden", className)}>
            <MapContainer
                center={getCenter()}
                zoom={14}
                className="h-full w-full min-h-[300px]"
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBoundsUpdater
                    shipperLocation={shipperLocation}
                    deliveryAddress={deliveryAddress}
                    pickupAddress={pickupAddress}
                    followShipper={followShipper}
                />

                {/* Pickup marker (orange) */}
                {pickupAddress.lat && pickupAddress.lng && (
                    <Marker
                        position={[pickupAddress.lat, pickupAddress.lng]}
                        icon={pickupIcon}
                    >
                        <Popup>
                            <div className="text-sm">
                                <div className="font-medium text-orange-600">Điểm lấy hàng</div>
                                <div className="text-gray-600 mt-1">{pickupAddress.address}</div>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Delivery marker (green) */}
                {deliveryAddress.lat && deliveryAddress.lng && (
                    <Marker
                        position={[deliveryAddress.lat, deliveryAddress.lng]}
                        icon={deliveryIcon}
                    >
                        <Popup>
                            <div className="text-sm">
                                <div className="font-medium text-green-600">Điểm giao hàng</div>
                                <div className="text-gray-600 mt-1">{deliveryAddress.address}</div>
                                {estimatedArrival && (
                                    <div className="text-shopee-orange mt-1">
                                        Dự kiến: {estimatedArrival}
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Shipper marker (blue) */}
                {shipperLocation && (
                    <Marker
                        position={[shipperLocation.lat, shipperLocation.lng]}
                        icon={shipperIcon}
                    >
                        <Popup>
                            <div className="text-sm">
                                <div className="font-medium text-blue-600">Shipper đang giao</div>
                                {shipperLocation.speed && (
                                    <div className="text-gray-600 mt-1">
                                        Tốc độ: {Math.round(shipperLocation.speed)} km/h
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Route line - real route from Goong or fallback to straight line */}
                {routePositions.length >= 2 && (
                    <Polyline
                        positions={routePositions}
                        pathOptions={{
                            color: "#3b82f6",
                            weight: 5,
                            opacity: 0.8,
                            // Solid line for real route, dashed for fallback
                            dashArray: routeData ? undefined : "10, 10",
                        }}
                    />
                )}
                
                {/* Route from pickup to delivery (background route) */}
                {pickupAddress.lat && pickupAddress.lng && deliveryAddress.lat && deliveryAddress.lng && !shipperLocation && (
                    <Polyline
                        positions={[
                            [pickupAddress.lat, pickupAddress.lng],
                            [deliveryAddress.lat, deliveryAddress.lng],
                        ]}
                        pathOptions={{
                            color: "#9ca3af",
                            weight: 3,
                            opacity: 0.5,
                            dashArray: "5, 10",
                        }}
                    />
                )}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 z-[1000]">
                <div className="text-xs font-medium mb-2">Chú thích</div>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-xs">Điểm lấy hàng</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-xs">Điểm giao hàng</span>
                    </div>
                    {shipperLocation && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-xs">Shipper</span>
                        </div>
                    )}
                </div>
                {/* Route info */}
                {routeData?.route && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                            {routeData.route.distance?.text} • {routeData.route.duration?.text}
                        </div>
                    </div>
                )}
            </div>

            {/* Real-time connection indicator */}
            {enableRealtime && (
                <div className="absolute top-4 right-4 z-[1000]">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md",
                        isConnected 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-500"
                    )}>
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                        )} />
                        {isConnected ? "Đang theo dõi trực tiếp" : "Đang kết nối..."}
                    </div>
                </div>
            )}
            
            {/* Route loading indicator */}
            {routeLoading && (
                <div className="absolute top-4 left-4 z-[1000]">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md bg-blue-100 text-blue-700">
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Đang tải đường đi...
                    </div>
                </div>
            )}
            
            {/* Follow shipper button - only show when shipper location is available */}
            {shipperLocation && (
                <div className="absolute top-14 right-4 z-[1000]">
                    <button
                        onClick={() => setFollowShipper(!followShipper)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-colors",
                            followShipper 
                                ? "bg-blue-500 text-white" 
                                : "bg-white text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        {followShipper ? "Đang theo dõi" : "Theo dõi shipper"}
                    </button>
                </div>
            )}
        </div>
    );
}
