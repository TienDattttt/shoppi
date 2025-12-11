import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "../common/Rating";
import { ThumbsUp, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { productService } from "@/services/product.service";

interface ReviewStats {
    totalCount: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
}

interface Review {
    id: string;
    rating: number;
    title?: string;
    content: string;
    created_at: string;
    helpful_count?: number;
    reply?: string;
    replied_at?: string;
    users?: { full_name: string; avatar_url?: string };
}

interface ProductReviewsProps {
    productId?: string;
    description?: string;
}

export function ProductReviews({ productId, description }: ProductReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);

    useEffect(() => {
        if (productId) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    // Fetch reviews
                    const reviewData = await productService.getReviews(productId, { 
                        limit: 10,
                        rating: selectedRating || undefined 
                    });
                    const reviewList = reviewData?.data || reviewData?.reviews || reviewData || [];
                    setReviews(Array.isArray(reviewList) ? reviewList : []);

                    // Fetch stats
                    try {
                        const statsData = await productService.getReviewStats(productId);
                        setStats(statsData);
                    } catch {
                        // Stats endpoint might not exist, calculate from reviews
                        if (reviewList.length > 0) {
                            const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                            let sum = 0;
                            reviewList.forEach((r: Review) => {
                                dist[r.rating] = (dist[r.rating] || 0) + 1;
                                sum += r.rating;
                            });
                            setStats({
                                totalCount: reviewList.length,
                                averageRating: Math.round((sum / reviewList.length) * 10) / 10,
                                ratingDistribution: dist,
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch reviews:', error);
                    setReviews([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [productId, selectedRating]);

    const handleFilterRating = (rating: number | null) => {
        setSelectedRating(rating);
    };

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm min-h-[400px]">
            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Thông Tin Chi Tiết</h2>
            <div className="grid grid-cols-[140px_1fr] gap-2 text-sm mb-8 px-4">
                <span className="text-muted-foreground">Danh mục</span>
                <span className="text-blue-500">Shoppi</span>

                <span className="text-muted-foreground">Gửi từ</span>
                <span>Việt Nam</span>
            </div>

            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Mô Tả Sản Phẩm</h2>
            <div className="text-sm leading-relaxed px-4 whitespace-pre-line mb-8">
                {description || 'Chưa có mô tả sản phẩm.'}
            </div>

            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Đánh Giá Sản Phẩm</h2>
            <div className="px-4">
                {/* Summary Header */}
                <div className="flex items-start gap-8 bg-orange-50/50 p-6 border border-orange-100 rounded-sm mb-6">
                    <div className="text-center">
                        <div className="text-4xl text-shopee-orange font-medium">
                            {stats?.averageRating?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-shopee-orange text-lg">
                            <Rating value={Math.round(stats?.averageRating || 0)} size={16} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {stats?.totalCount || 0} đánh giá
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-1">
                        <FilterButton 
                            active={selectedRating === null} 
                            onClick={() => handleFilterRating(null)}
                        >
                            Tất cả ({stats?.totalCount || 0})
                        </FilterButton>
                        {[5, 4, 3, 2, 1].map(star => (
                            <FilterButton 
                                key={star}
                                active={selectedRating === star}
                                onClick={() => handleFilterRating(star)}
                            >
                                {star} Sao ({stats?.ratingDistribution?.[star] || 0})
                            </FilterButton>
                        ))}
                    </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="text-center text-muted-foreground py-8">
                            Đang tải đánh giá...
                        </div>
                    ) : reviews.length > 0 ? (
                        reviews.map((review) => (
                            <ReviewItem key={review.id} review={review} />
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                {selectedRating 
                                    ? `Chưa có đánh giá ${selectedRating} sao nào.`
                                    : 'Chưa có đánh giá nào cho sản phẩm này.'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Hãy là người đầu tiên đánh giá sản phẩm!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FilterButton({ 
    active, 
    children, 
    onClick 
}: { 
    active?: boolean; 
    children: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1 border rounded-sm text-sm transition-colors ${
                active
                    ? 'border-shopee-orange text-shopee-orange bg-white'
                    : 'border-gray-200 bg-white hover:border-shopee-orange/50'
            }`}
        >
            {children}
        </button>
    );
}

interface ReviewItemProps {
    review: Review;
}

function ReviewItem({ review }: ReviewItemProps) {
    const userName = review.users?.full_name || 'Người dùng ẩn danh';
    const userAvatar = review.users?.avatar_url;
    
    return (
        <div className="flex gap-4 border-b pb-4 last:border-0">
            <Avatar className="h-10 w-10">
                <AvatarImage src={userAvatar || `https://i.pravatar.cc/150?u=${review.id}`} />
                <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
                <div className="text-sm font-medium">{userName}</div>
                <Rating value={review.rating} size={12} />
                <div className="text-xs text-muted-foreground mt-1">
                    {new Date(review.created_at).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
                {review.title && (
                    <p className="text-sm font-medium mt-2">{review.title}</p>
                )}
                <p className="text-sm mt-1">{review.content}</p>

                {/* Shop Reply */}
                {review.reply && (
                    <div className="bg-gray-50 p-3 rounded-sm mt-3">
                        <div className="text-xs font-medium text-shopee-orange mb-1">
                            Phản hồi của Shop
                        </div>
                        <p className="text-sm text-gray-600">{review.reply}</p>
                        {review.replied_at && (
                            <div className="text-xs text-muted-foreground mt-1">
                                {new Date(review.replied_at).toLocaleDateString('vi-VN')}
                            </div>
                        )}
                    </div>
                )}

                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1 cursor-pointer hover:text-shopee-orange w-fit">
                    <ThumbsUp className="h-3 w-3" /> 
                    Hữu ích {review.helpful_count ? `(${review.helpful_count})` : ''}
                </div>
            </div>
        </div>
    );
}
