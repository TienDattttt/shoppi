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
import { Star, Loader2 } from "lucide-react";
import { productService } from "@/services/product.service";
import { toast } from "sonner";

interface ReviewItem {
    productId: string;
    productName: string;
    variantName?: string | null;
    imageUrl?: string | null;
}

interface ReviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: ReviewItem[];
    onSuccess?: () => void;
}

export function ReviewModal({ open, onOpenChange, items, onSuccess }: ReviewModalProps) {
    const [reviews, setReviews] = useState<Record<string, { rating: number; content: string }>>({});
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const currentItem = items[currentIndex];
    const currentReview = reviews[currentItem?.productId] || { rating: 5, content: "" };

    const handleRatingChange = (rating: number) => {
        if (!currentItem) return;
        setReviews(prev => ({
            ...prev,
            [currentItem.productId]: { ...currentReview, rating }
        }));
    };

    const handleContentChange = (content: string) => {
        if (!currentItem) return;
        setReviews(prev => ({
            ...prev,
            [currentItem.productId]: { ...currentReview, content }
        }));
    };

    const handleSubmit = async () => {
        if (!currentItem) return;

        if (!currentReview.content.trim()) {
            toast.error("Vui lòng nhập nội dung đánh giá");
            return;
        }

        setLoading(true);
        try {
            await productService.createReview(currentItem.productId, {
                rating: currentReview.rating,
                content: currentReview.content.trim(),
            });

            toast.success(`Đã đánh giá "${currentItem.productName}"`);

            // Move to next item or close
            if (currentIndex < items.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                onOpenChange(false);
                onSuccess?.();
                // Reset state
                setReviews({});
                setCurrentIndex(0);
            }
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || "Không thể gửi đánh giá";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onOpenChange(false);
            setReviews({});
            setCurrentIndex(0);
        }
    };

    if (!currentItem) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Đánh giá sản phẩm</DialogTitle>
                    <DialogDescription>
                        Sản phẩm {currentIndex + 1}/{items.length}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Product Info */}
                    <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                        <img
                            src={currentItem.imageUrl || "https://placehold.co/80x80?text=Product"}
                            alt={currentItem.productName}
                            className="w-20 h-20 object-cover rounded border"
                        />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2">{currentItem.productName}</h4>
                            {currentItem.variantName && (
                                <p className="text-xs text-gray-500 mt-1">{currentItem.variantName}</p>
                            )}
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Chất lượng sản phẩm</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleRatingChange(star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                >
                                    <Star
                                        className={`h-8 w-8 ${
                                            star <= currentReview.rating
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-gray-300"
                                        }`}
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-500 self-center">
                                {getRatingText(currentReview.rating)}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nhận xét của bạn</label>
                        <Textarea
                            placeholder="Hãy chia sẻ nhận xét của bạn về sản phẩm này..."
                            value={currentReview.content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            rows={4}
                            maxLength={1000}
                        />
                        <p className="text-xs text-gray-400 text-right">
                            {currentReview.content.length}/1000
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    {items.length > 1 && (
                        <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                            Bỏ qua
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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

function getRatingText(rating: number): string {
    const texts: Record<number, string> = {
        1: "Tệ",
        2: "Không hài lòng",
        3: "Bình thường",
        4: "Hài lòng",
        5: "Tuyệt vời",
    };
    return texts[rating] || "";
}
