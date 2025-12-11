import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, Check, Star, Users, Clock, MapPin, Loader2, Package } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { shopService } from "@/services/shop.service";
import { toast } from "sonner";

interface ShopHeaderProps {
    shop: {
        id: string;
        name: string;
        avatar: string;
        cover: string;
        rating: number;
        products: number;
        followers: number;
        joinedDate: string;
        responseRate: string;
        location: string;
        isOnline: boolean;
    };
    isFollowing?: boolean;
    onFollowChange?: (isFollowing: boolean) => void;
}

export function ShopHeader({ shop, isFollowing = false, onFollowChange }: ShopHeaderProps) {
    const { openChatWithShop } = useChatStore();
    const { user, token } = useAuthStore();
    const [following, setFollowing] = useState(isFollowing);
    const [loading, setLoading] = useState(false);

    // Sync following state when isFollowing prop changes
    React.useEffect(() => {
        setFollowing(isFollowing);
    }, [isFollowing]);

    const handleChat = () => {
        openChatWithShop(shop.id, shop.name, shop.avatar);
    };

    const handleFollow = async () => {
        if (!token || !user) {
            toast.error("Vui lòng đăng nhập để theo dõi shop");
            return;
        }

        try {
            setLoading(true);
            if (following) {
                await shopService.unfollowShop(shop.id);
                setFollowing(false);
                onFollowChange?.(false);
                toast.success("Đã bỏ theo dõi shop");
            } else {
                await shopService.followShop(shop.id);
                setFollowing(true);
                onFollowChange?.(true);
                toast.success("Đã theo dõi shop");
            }
        } catch (error: any) {
            console.error("Follow error:", error);
            const message = error.response?.data?.message || "Có lỗi xảy ra";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const formatFollowers = (count: number) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        }
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}k`;
        }
        return count.toString();
    };

    return (
        <div className="bg-white shadow-sm mb-4">
            {/* Cover Image + Info Overlay */}
            <div className="relative h-48 md:h-64 bg-gray-200 overflow-hidden">
                <img
                    src={shop.cover}
                    alt="cover"
                    className="w-full h-full object-cover"
                />

                {/* Shop Info Card Overlay */}
                <div className="absolute top-0 left-0 bottom-0 bg-black/40 w-full flex items-center p-4 md:p-8">
                    <div className="bg-black/60 backdrop-blur-sm p-4 rounded-lg flex gap-4 text-white max-w-2xl">
                        <div className="relative shrink-0">
                            <img
                                src={shop.avatar}
                                alt="avatar"
                                className="h-20 w-20 rounded-full border-2 border-white object-cover"
                            />
                            {shop.isOnline && (
                                <div className="absolute bottom-1 right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                        </div>

                        <div className="flex flex-col justify-center gap-2">
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-2">
                                    {shop.name}
                                    <span className="bg-shopee-orange text-xs px-1 rounded text-white font-normal">Official</span>
                                </h1>
                                <div className="text-xs text-gray-300 mt-1 flex items-center gap-1">
                                    <span className="opacity-80">Online 5 phút trước</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-white text-white hover:bg-white/20 hover:text-white"
                                    onClick={handleChat}
                                >
                                    <MessageCircle className="h-4 w-4 mr-1" /> Chat ngay
                                </Button>
                                <Button
                                    size="sm"
                                    className={`h-8 ${following 
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                                        : 'bg-white text-black hover:bg-gray-100'
                                    }`}
                                    onClick={handleFollow}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : following ? (
                                        <>
                                            <Check className="h-4 w-4 mr-1" /> Đang theo dõi
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-1" /> Theo dõi
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="container mx-auto px-4 py-4">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 divide-x divide-gray-100 text-sm">
                    <div className="flex items-center gap-3 px-2">
                        <Star className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Đánh giá</div>
                            <div className="text-shopee-orange font-medium">{shop.rating.toFixed(1)} / 5.0</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                        <Package className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Sản phẩm</div>
                            <div className="font-medium">{shop.products}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                        <Users className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Người theo dõi</div>
                            <div className="font-medium">{formatFollowers(shop.followers)}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                        <Clock className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Tỉ lệ phản hồi</div>
                            <div className="font-medium">{shop.responseRate}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                        <MapPin className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Địa chỉ</div>
                            <div className="font-medium">{shop.location}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                        <Clock className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Tham gia</div>
                            <div className="font-medium">{shop.joinedDate}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
