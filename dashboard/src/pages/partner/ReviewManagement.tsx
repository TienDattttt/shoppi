import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Send, Filter } from "lucide-react";
import { reviewService, type Review } from "@/services/review.service";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ReviewStats {
    total: number;
    average: number;
    pending: number;
    distribution: Record<number, number>;
}

export default function ReviewManagement() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats>({ total: 0, average: 0, pending: 0, distribution: {} });
    const [loading, setLoading] = useState(true);
    const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [filterRating, setFilterRating] = useState<string>("all");
    const [filterReply, setFilterReply] = useState<string>("all");

    useEffect(() => {
        loadReviews();
    }, [filterRating, filterReply]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filterRating !== "all") params.rating = filterRating;
            if (filterReply !== "all") params.has_reply = filterReply;
            
            const data = await reviewService.getShopReviews(params);
            setReviews(data.data || []);
            setStats(data.stats || { total: 0, average: 0, pending: 0, distribution: {} });
        } catch (error) {
            console.error("Failed to load reviews:", error);
            toast.error("Không thể tải đánh giá");
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (reviewId: string, productId: string) => {
        const content = replyTexts[reviewId]?.trim();
        if (!content) {
            toast.error("Vui lòng nhập nội dung phản hồi");
            return;
        }

        setSubmitting(reviewId);
        try {
            await reviewService.replyToReview(productId, reviewId, content);
            toast.success("Đã gửi phản hồi");
            setReplyTexts(prev => ({ ...prev, [reviewId]: "" }));
            loadReviews();
        } catch (error: any) {
            toast.error(error?.response?.data?.error?.message || "Không thể gửi phản hồi");
        } finally {
            setSubmitting(null);
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-3 w-3 ${star <= rating ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                    />
                ))}
            </div>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return "Hôm nay";
        if (diffDays === 1) return "Hôm qua";
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString("vi-VN");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Đánh giá & Nhận xét</h1>
                <p className="text-muted-foreground mt-1">Quản lý phản hồi từ khách hàng</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-sm text-muted-foreground">Tổng đánh giá</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold flex items-center gap-1">
                            {stats.average.toFixed(1)}
                            <Star className="h-5 w-5 text-yellow-500 fill-current" />
                        </div>
                        <div className="text-sm text-muted-foreground">Điểm trung bình</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
                        <div className="text-sm text-muted-foreground">Chờ phản hồi</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-500">
                            {stats.total > 0 ? Math.round(((stats.total - stats.pending) / stats.total) * 100) : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Tỷ lệ phản hồi</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Lọc:</span>
                </div>
                <Select value={filterRating} onValueChange={setFilterRating}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Số sao" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả sao</SelectItem>
                        <SelectItem value="5">5 sao</SelectItem>
                        <SelectItem value="4">4 sao</SelectItem>
                        <SelectItem value="3">3 sao</SelectItem>
                        <SelectItem value="2">2 sao</SelectItem>
                        <SelectItem value="1">1 sao</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterReply} onValueChange={setFilterReply}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="false">Chưa phản hồi</SelectItem>
                        <SelectItem value="true">Đã phản hồi</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : reviews.length === 0 ? (
                <Card className="shadow-premium border-border/50">
                    <CardContent className="py-12 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Chưa có đánh giá nào</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <Card key={review.id} className="shadow-premium border-border/50">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <Avatar>
                                            <AvatarImage src={review.user?.avatar_url || undefined} />
                                            <AvatarFallback>
                                                {review.user?.full_name?.charAt(0) || "K"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm">
                                                    {review.is_anonymous ? "Khách hàng ẩn danh" : (review.user?.full_name || "Khách hàng")}
                                                </p>
                                                <span className="text-xs text-muted-foreground">
                                                    • {formatDate(review.created_at)}
                                                </span>
                                                {!review.reply && (
                                                    <Badge variant="outline" className="text-orange-500 border-orange-200">
                                                        Chờ phản hồi
                                                    </Badge>
                                                )}
                                            </div>
                                            {renderStars(review.rating)}
                                        </div>
                                    </div>
                                    {review.product && (
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-muted-foreground text-right">
                                                <p className="max-w-[200px] truncate font-medium">{review.product.name}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {review.content && (
                                    <p className="text-sm">{review.content}</p>
                                )}

                                {/* Review Images - if available */}
                                {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        {review.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={img}
                                                alt={`Review ${idx + 1}`}
                                                className="h-20 w-20 object-cover rounded border"
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Reply Section */}
                                <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                                    <p className="text-xs font-semibold flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" /> Phản hồi của Shop
                                    </p>
                                    
                                    {review.reply ? (
                                        <div className="text-sm bg-background p-3 rounded border">
                                            <p>{review.reply}</p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Đã phản hồi {review.replied_at ? formatDate(review.replied_at) : ""}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Textarea
                                                placeholder="Nhập phản hồi của bạn..."
                                                className="min-h-[60px] text-sm"
                                                value={replyTexts[review.id] || ""}
                                                onChange={(e) => setReplyTexts(prev => ({
                                                    ...prev,
                                                    [review.id]: e.target.value
                                                }))}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleReply(review.id, review.product_id)}
                                                disabled={submitting === review.id}
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
