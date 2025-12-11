import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "../common/Rating";
import { ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { productService } from "@/services/product.service";

interface ProductReviewsProps {
    productId?: string;
    description?: string;
}

export function ProductReviews({ productId, description }: ProductReviewsProps) {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (productId) {
            const fetchReviews = async () => {
                setLoading(true);
                try {
                    const data = await productService.getReviews(productId, { limit: 5 });
                    setReviews(data.reviews || data || []);
                } catch (error) {
                    console.error('Failed to fetch reviews:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchReviews();
        }
    }, [productId]);

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm min-h-[400px]">
            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Thông Tin Chi Tiết</h2>
            <div className="grid grid-cols-[140px_1fr] gap-2 text-sm mb-8 px-4">
                <span className="text-muted-foreground">Danh mục</span>
                <span className="text-blue-500">Shoppi / Điện tử / Laptop</span>

                <span className="text-muted-foreground">Thương hiệu</span>
                <span>Apple</span>

                <span className="text-muted-foreground">Kho hàng</span>
                <span>45</span>

                <span className="text-muted-foreground">Gửi từ</span>
                <span>Hà Nội</span>
            </div>

            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Mô Tả Sản Phẩm</h2>
            <div className="text-sm leading-relaxed px-4 whitespace-pre-line mb-8">
                {description || `MacBook Air 13 inch M1 2020 là laptop siêu mỏng, siêu nhẹ với thiết kế không quạt hoàn toàn im lặng 🤫. 
                
Tính năng nổi bật:
- Chip Apple M1 với CPU 8 nhân và GPU 7 nhân
- Bộ nhớ hợp nhất 8GB
- Ổ cứng SSD 256GB
- Màn hình Retina với True Tone
- Magic Keyboard
- Touch ID
- Force Touch trackpad
- Hai cổng Thunderbolt / USB 4`}
            </div>

            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Đánh Giá Sản Phẩm</h2>
            <div className="px-4">
                {/* Summary Header */}
                <div className="flex items-start gap-8 bg-orange-50/50 p-6 border border-orange-100 rounded-sm mb-6">
                    <div className="text-center">
                        <div className="text-4xl text-shopee-orange font-medium">4.8</div>
                        <div className="text-shopee-orange text-lg"><Rating value={5} size={16} /></div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-1">
                        <FilterButton active>Tất cả</FilterButton>
                        <FilterButton>5 Sao (10k)</FilterButton>
                        <FilterButton>4 Sao (500)</FilterButton>
                        <FilterButton>3 Sao (100)</FilterButton>
                        <FilterButton>Có bình luận (5.2k)</FilterButton>
                        <FilterButton>Có hình ảnh (2.1k)</FilterButton>
                    </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="text-center text-muted-foreground py-8">Đang tải đánh giá...</div>
                    ) : reviews.length > 0 ? (
                        reviews.map((review, i) => (
                            <ReviewItem key={review.id || i} review={review} />
                        ))
                    ) : (
                        // Show mock reviews if no real reviews
                        Array.from({ length: 3 }).map((_, i) => (
                            <ReviewItem key={i} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function FilterButton({ active, children }: { active?: boolean, children: React.ReactNode }) {
    return (
        <button
            className={`px-4 py-1 border rounded-sm text-sm ${active
                    ? 'border-shopee-orange text-shopee-orange bg-white'
                    : 'border-gray-200 bg-white hover:border-shopee-orange/50'
                }`}
        >
            {children}
        </button>
    )
}

interface ReviewItemProps {
    review?: {
        id: string;
        rating: number;
        content: string;
        created_at: string;
        user?: { full_name: string };
        images?: string[];
    };
}

function ReviewItem({ review }: ReviewItemProps) {
    return (
        <div className="flex gap-4 border-b pb-4 last:border-0">
            <Avatar className="h-10 w-10">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${Math.random()}`} />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
                <div className="text-xs text-muted-foreground">{review?.user?.full_name || 'Người dùng'}</div>
                <Rating value={review?.rating || 5} size={12} />
                <div className="text-xs text-muted-foreground mt-1">
                    {review?.created_at ? new Date(review.created_at).toLocaleDateString('vi-VN') : '2023-10-15'} | Phân loại: Xám, 256GB
                </div>
                <p className="text-sm mt-2">
                    {review?.content || 'Sản phẩm tuyệt vời, giao hàng rất nhanh. Đóng gói cẩn thận và hàng đến trong tình trạng hoàn hảo. Rất đáng mua!'}
                </p>

                {review?.images && review.images.length > 0 ? (
                    <div className="flex gap-2 mt-2">
                        {review.images.map((img, idx) => (
                            <img key={idx} src={img} alt="" className="h-16 w-16 object-cover rounded-sm" />
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-2 mt-2">
                        <div className="h-16 w-16 bg-gray-100 rounded-sm"></div>
                        <div className="h-16 w-16 bg-gray-100 rounded-sm"></div>
                    </div>
                )}

                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1 cursor-pointer hover:text-shopee-orange w-fit">
                    <ThumbsUp className="h-3 w-3" /> Hữu ích?
                </div>
            </div>
        </div>
    )
}
