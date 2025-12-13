import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";

interface ShopInfoProps {
    shop?: {
        id: string;
        partner_id?: string;
        shop_name?: string;
        name?: string;
        city?: string;
        address?: string;
        rating?: number;
        avg_rating?: number;
        response_rate?: number;
        follower_count?: number;
        product_count?: number;
        logo_url?: string;
        created_at?: string;
    };
}

export function ShopInfo({ shop }: ShopInfoProps) {
    const { openChatWithShop } = useChatStore();
    const { user } = useAuthStore();
    const isAuthenticated = !!user;
    const shopName = shop?.shop_name || shop?.name || 'Shop';
    const shopId = shop?.id;
    const logoUrl = shop?.logo_url || "https://github.com/shadcn.png";
    const rating = shop?.rating || shop?.avg_rating || 0;
    const followerCount = shop?.follower_count || 0;
    const productCount = shop?.product_count || 0;
    const city = shop?.city || shop?.address || 'Việt Nam';
    
    // Calculate joined time
    let joinedText = '4 năm trước';
    if (shop?.created_at) {
        const joinedDate = new Date(shop.created_at);
        const now = new Date();
        const diffYears = now.getFullYear() - joinedDate.getFullYear();
        const diffMonths = (now.getFullYear() - joinedDate.getFullYear()) * 12 + (now.getMonth() - joinedDate.getMonth());
        
        if (diffYears >= 1) {
            joinedText = `${diffYears} năm trước`;
        } else if (diffMonths >= 1) {
            joinedText = `${diffMonths} tháng trước`;
        } else {
            joinedText = 'Mới tham gia';
        }
    }
    
    return (
        <div className="bg-white p-6 rounded-sm shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center gap-4 border-r pr-6 border-gray-100 min-w-[300px]">
                <div className="relative">
                    <Avatar className="h-16 w-16 border">
                        <AvatarImage src={logoUrl} />
                        <AvatarFallback>{shopName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-shopee-orange text-white text-[10px] px-1 rounded-sm">
                        Official
                    </div>
                </div>
                <div>
                    <h3 className="font-medium text-lg">{shopName}</h3>
                    <p className="text-xs text-muted-foreground mb-2">Hoạt động 5 phút trước</p>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs border-shopee-orange text-shopee-orange hover:bg-orange-50 bg-orange-50/50"
                            onClick={() => {
                                if (isAuthenticated && shop?.partner_id) {
                                    openChatWithShop(shopId || '', shop.partner_id, shopName, logoUrl);
                                }
                            }}
                            disabled={!isAuthenticated || !shop?.partner_id}
                        >
                            <MessageCircle className="mr-1 h-3 w-3" /> Chat ngay
                        </Button>
                        {shopId ? (
                            <Link to={`/shop/${shopId}`}>
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <Store className="mr-1 h-3 w-3" /> Xem Shop
                                </Button>
                            </Link>
                        ) : (
                            <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
                                <Store className="mr-1 h-3 w-3" /> Xem Shop
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-2 text-sm">
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Đánh giá</span>
                    <span className="text-shopee-orange">{rating.toFixed(1)}</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Tỉ lệ phản hồi</span>
                    <span className="text-shopee-orange">{shop?.response_rate || 98}%</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Tham gia</span>
                    <span className="text-shopee-orange">{joinedText}</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Sản phẩm</span>
                    <span className="text-shopee-orange">{productCount}</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Địa chỉ</span>
                    <span className="text-shopee-orange">{city}</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Người theo dõi</span>
                    <span className="text-shopee-orange">{formatNumber(followerCount)}</span>
                </div>
            </div>
        </div>
    );
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}
