import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { shopService } from "@/services/shop.service";
import { Button } from "@/components/ui/button";
import { Loader2, Store, Users, Star, MapPin } from "lucide-react";
import { toast } from "sonner";

interface FollowedShop {
    id: string;
    shopName: string;
    slug: string;
    logoUrl: string | null;
    rating: number;
    followerCount: number;
    productCount: number;
    city: string | null;
    followedAt: string;
}

export default function FollowedShopsPage() {
    const [shops, setShops] = useState<FollowedShop[]>([]);
    const [loading, setLoading] = useState(true);
    const [unfollowingId, setUnfollowingId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchFollowedShops();
    }, [page]);

    const fetchFollowedShops = async () => {
        try {
            setLoading(true);
            const response = await shopService.getFollowedShops({ page, limit: 12 });
            // Response format: { data: [{ followed_at, shop: {...} }], total, page, limit, hasMore }
            const shopsData = (response.data || []).map((item: any) => ({
                id: item.shop?.id,
                shopName: item.shop?.shop_name,
                slug: item.shop?.slug,
                logoUrl: item.shop?.logo_url,
                rating: item.shop?.avg_rating || 0,
                followerCount: item.shop?.follower_count || 0,
                productCount: item.shop?.product_count || 0,
                city: item.shop?.city,
                followedAt: item.followed_at,
            }));
            setShops(shopsData);
            setTotal(response.total || 0);
            setHasMore(response.hasMore || false);
        } catch (error: any) {
            console.error("Error fetching followed shops:", error);
            toast.error("Không thể tải danh sách shop đang theo dõi");
        } finally {
            setLoading(false);
        }
    };

    const handleUnfollow = async (shopId: string) => {
        try {
            setUnfollowingId(shopId);
            await shopService.unfollowShop(shopId);
            setShops(shops.filter(s => s.id !== shopId));
            setTotal(prev => prev - 1);
            toast.success("Đã bỏ theo dõi shop");
        } catch (error: any) {
            console.error("Error unfollowing shop:", error);
            toast.error("Có lỗi xảy ra");
        } finally {
            setUnfollowingId(null);
        }
    };

    const formatFollowers = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
        return count.toString();
    };

    if (loading && page === 1) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold text-gray-800">
                    Shop đang theo dõi ({total})
                </h1>
            </div>

            {shops.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg">
                    <Store className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                        Bạn chưa theo dõi shop nào
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Theo dõi các shop yêu thích để nhận thông báo về sản phẩm mới và khuyến mãi
                    </p>
                    <Link to="/">
                        <Button className="bg-shopee-orange hover:bg-shopee-orange/90">
                            Khám phá ngay
                        </Button>
                    </Link>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shops.map((shop) => (
                            <div
                                key={shop.id}
                                className="bg-white rounded-lg border p-4 flex gap-4 hover:shadow-md transition-shadow"
                            >
                                <Link to={`/shop/${shop.id}`} className="shrink-0">
                                    <img
                                        src={shop.logoUrl || "https://placehold.co/80x80?text=Shop"}
                                        alt={shop.shopName}
                                        className="w-20 h-20 rounded-full object-cover border"
                                    />
                                </Link>

                                <div className="flex-1 min-w-0">
                                    <Link to={`/shop/${shop.id}`}>
                                        <h3 className="font-medium text-gray-800 hover:text-shopee-orange truncate">
                                            {shop.shopName}
                                        </h3>
                                    </Link>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Star className="h-4 w-4 text-yellow-500" />
                                            <span>{shop.rating?.toFixed(1) || "0.0"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            <span>{formatFollowers(shop.followerCount || 0)} theo dõi</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Store className="h-4 w-4" />
                                            <span>{shop.productCount || 0} sản phẩm</span>
                                        </div>
                                        {shop.city && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-4 w-4" />
                                                <span>{shop.city}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-3">
                                        <Link to={`/shop/${shop.id}`}>
                                            <Button size="sm" variant="outline" className="h-8">
                                                Xem Shop
                                            </Button>
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-gray-500 hover:text-red-500"
                                            onClick={() => handleUnfollow(shop.id)}
                                            disabled={unfollowingId === shop.id}
                                        >
                                            {unfollowingId === shop.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                "Bỏ theo dõi"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="text-center mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => p + 1)}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Xem thêm
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
