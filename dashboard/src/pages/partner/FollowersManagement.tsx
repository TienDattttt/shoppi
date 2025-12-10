import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/services/api";
import { toast } from "sonner";

interface Follower {
    followed_at: string;
    user: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    } | null;
}

interface FollowersResponse {
    data: Follower[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

export default function FollowersManagement() {
    const [followers, setFollowers] = useState<Follower[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalFollowers, setTotalFollowers] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [shopId, setShopId] = useState<string | null>(null);
    const limit = 20;

    useEffect(() => {
        loadShopAndFollowers();
    }, []);

    useEffect(() => {
        if (shopId) {
            loadFollowers(page);
        }
    }, [shopId, page]);

    const loadShopAndFollowers = async () => {
        try {
            // Get partner's shop first
            const shopResponse = await api.get("/shops/me");
            // API interceptor unwraps response.data.data to response.data
            // So shopResponse.data could be the shop directly or wrapped in { shop: ... }
            const shop = shopResponse.data?.shop || shopResponse.data;
            console.log("Shop response:", shopResponse.data, "Shop:", shop);
            if (shop?.id) {
                setShopId(shop.id);
            } else {
                toast.error("Không tìm thấy cửa hàng");
            }
        } catch (error) {
            console.error("Error loading shop:", error);
            toast.error("Không thể tải thông tin cửa hàng");
        }
    };

    const loadFollowers = async (pageNum: number) => {
        if (!shopId) return;
        
        setLoading(true);
        try {
            const response = await api.get<FollowersResponse>(`/shops/${shopId}/followers`, {
                params: { page: pageNum, limit }
            });
            
            const data = response.data;
            setFollowers(data.data || []);
            setTotalFollowers(data.total || 0);
            setHasMore(data.hasMore || false);
        } catch (error) {
            console.error("Error loading followers:", error);
            toast.error("Không thể tải danh sách người theo dõi");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const totalPages = Math.ceil(totalFollowers / limit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Người theo dõi</h1>
                <p className="text-muted-foreground mt-1">
                    Quản lý danh sách khách hàng đang theo dõi cửa hàng của bạn
                </p>
            </div>

            {/* Stats Card */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng người theo dõi</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalFollowers.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Khách hàng đang theo dõi shop
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Followers List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Danh sách người theo dõi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Đang tải...
                        </div>
                    ) : followers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Chưa có người theo dõi</h3>
                            <p className="text-muted-foreground">
                                Khi khách hàng theo dõi cửa hàng của bạn, họ sẽ xuất hiện ở đây
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y">
                                {followers.map((follower, index) => (
                                    <div 
                                        key={follower.user?.id || index} 
                                        className="flex items-center justify-between py-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={follower.user?.avatar_url || undefined} />
                                                <AvatarFallback>
                                                    {(follower.user?.full_name || 'U').substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">
                                                    {follower.user?.full_name || 'Người dùng ẩn danh'}
                                                </p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Theo dõi từ {formatDate(follower.followed_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Trang {page} / {totalPages} ({totalFollowers} người theo dõi)
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={!hasMore}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
