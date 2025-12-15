import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Truck, User } from "lucide-react";
import { shipperService } from "@/services/shipper.service";
import { toast } from "sonner";

/**
 * Shipper info for rating modal
 */
export interface ShipperRatingInfo {
    id: string;
    name: string;
    avatarUrl?: string;
    vehicleType?: string;
    vehiclePlate?: string;
}

/**
 * Shipment info for rating
 */
export interface ShipmentRatingInfo {
    id: string;
    trackingNumber: string;
    shipper: ShipperRatingInfo | null;
}

/**
 * Props for ShipperRatingModal component
 * Requirements: 15.1, 15.5
 */
interface ShipperRatingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shipments: ShipmentRatingInfo[];
    onSuccess?: () => void;
}

/**
 * ShipperRatingModal Component
 * 
 * Displays a modal for rating shipper delivery experience.
 * Supports rating multiple shipments (for multi-shop orders).
 * 
 * Requirements:
 * - 15.1: Prompt customer to rate delivery (1-5 stars)
 * - 15.5: Allow optional feedback comment
 */
export function ShipperRatingModal({ 
    open, 
    onOpenChange, 
    shipments, 
    onSuccess 
}: ShipperRatingModalProps) {
    const [ratings, setRatings] = useState<Record<string, { rating: number; comment: string }>>({});
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Filter shipments that have shippers assigned
    const rateableShipments = shipments.filter(s => s.shipper !== null);
    
    const currentShipment = rateableShipments[currentIndex];
    const currentRating = currentShipment 
        ? (ratings[currentShipment.id] || { rating: 5, comment: "" })
        : { rating: 5, comment: "" };

    const handleRatingChange = (rating: number) => {
        if (!currentShipment) return;
        setRatings(prev => ({
            ...prev,
            [currentShipment.id]: { ...currentRating, rating }
        }));
    };

    const handleCommentChange = (comment: string) => {
        if (!currentShipment) return;
        setRatings(prev => ({
            ...prev,
            [currentShipment.id]: { ...currentRating, comment }
        }));
    };

    const handleSubmit = async () => {
        if (!currentShipment) return;

        setLoading(true);
        try {
            await shipperService.rateShipment(
                currentShipment.id,
                currentRating.rating,
                currentRating.comment.trim() || undefined
            );

            toast.success(`Đã đánh giá shipper ${currentShipment.shipper?.name || ''}`);

            // Move to next shipment or close
            if (currentIndex < rateableShipments.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                handleClose();
                onSuccess?.();
            }
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || "Không thể gửi đánh giá";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        if (currentIndex < rateableShipments.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after modal closes
        setTimeout(() => {
            setRatings({});
            setCurrentIndex(0);
        }, 200);
    };

    // Don't render if no rateable shipments
    if (rateableShipments.length === 0 || !currentShipment) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-shopee-orange" />
                        Đánh giá shipper
                    </DialogTitle>
                    {rateableShipments.length > 1 && (
                        <DialogDescription>
                            Đơn hàng {currentIndex + 1}/{rateableShipments.length}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="space-y-5">
                    {/* Shipper Info */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {currentShipment.shipper?.avatarUrl ? (
                                <img
                                    src={currentShipment.shipper.avatarUrl}
                                    alt={currentShipment.shipper.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <User className="h-7 w-7 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{currentShipment.shipper?.name || 'Shipper'}</h4>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                {currentShipment.shipper?.vehicleType && (
                                    <span>{currentShipment.shipper.vehicleType}</span>
                                )}
                                {currentShipment.shipper?.vehiclePlate && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <span>{currentShipment.shipper.vehiclePlate}</span>
                                    </>
                                )}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                Mã vận đơn: {currentShipment.trackingNumber}
                            </div>
                        </div>
                    </div>

                    {/* Star Rating - Requirements 15.1 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Chất lượng giao hàng</label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleRatingChange(star)}
                                    className="p-1 hover:scale-110 transition-transform focus:outline-none"
                                    aria-label={`${star} sao`}
                                >
                                    <Star
                                        className={`h-9 w-9 ${
                                            star <= currentRating.rating
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-gray-300 hover:text-yellow-200"
                                        }`}
                                    />
                                </button>
                            ))}
                            <span className="ml-3 text-sm text-gray-600">
                                {getRatingText(currentRating.rating)}
                            </span>
                        </div>
                    </div>

                    {/* Comment - Requirements 15.5 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Nhận xét của bạn <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                        </label>
                        <Textarea
                            placeholder="Chia sẻ trải nghiệm giao hàng của bạn..."
                            value={currentRating.comment}
                            onChange={(e) => handleCommentChange(e.target.value)}
                            rows={3}
                            maxLength={500}
                            className="resize-none"
                        />
                        <p className="text-xs text-gray-400 text-right">
                            {currentRating.comment.length}/500
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    {rateableShipments.length > 1 && (
                        <Button 
                            variant="ghost" 
                            onClick={handleSkip} 
                            disabled={loading}
                            className="mr-auto"
                        >
                            Bỏ qua
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        onClick={handleClose} 
                        disabled={loading}
                    >
                        Đóng
                    </Button>
                    <Button
                        className="bg-shopee-orange hover:bg-shopee-orange-hover text-white"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Gửi đánh giá
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Get Vietnamese text for rating value
 */
function getRatingText(rating: number): string {
    const texts: Record<number, string> = {
        1: "Rất tệ",
        2: "Không hài lòng",
        3: "Bình thường",
        4: "Hài lòng",
        5: "Tuyệt vời",
    };
    return texts[rating] || "";
}
