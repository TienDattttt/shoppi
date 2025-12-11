import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Store } from "lucide-react";
import { Link } from "react-router-dom";

interface ShopInfoProps {
    shop?: {
        id: string;
        shop_name: string;
        city?: string;
        avg_rating?: number;
        response_rate?: number;
        follower_count?: number;
    };
}

export function ShopInfo({ shop }: ShopInfoProps) {
    const shopName = shop?.shop_name || 'Shoppi Official Store';
    
    return (
        <div className="bg-white p-6 rounded-sm shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center gap-4 border-r pr-6 border-gray-100 min-w-[300px]">
                <div className="relative">
                    <Avatar className="h-16 w-16 border">
                        <AvatarImage src="https://github.com/shadcn.png" />
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
                        <Button variant="outline" size="sm" className="h-8 text-xs border-shopee-orange text-shopee-orange hover:bg-orange-50 bg-orange-50/50">
                            <MessageCircle className="mr-1 h-3 w-3" /> Chat ngay
                        </Button>
                        <Link to={shop?.id ? `/shop/${shop.id}` : '#'}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                                <Store className="mr-1 h-3 w-3" /> Xem Shop
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-2 text-sm">
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Đánh giá</span>
                    <span className="text-shopee-orange">{shop?.avg_rating?.toFixed(1) || '4.9'}</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Tỉ lệ phản hồi</span>
                    <span className="text-shopee-orange">{shop?.response_rate || 98}%</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Tham gia</span>
                    <span className="text-shopee-orange">4 năm trước</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Sản phẩm</span>
                    <span className="text-shopee-orange">452</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Thời gian phản hồi</span>
                    <span className="text-shopee-orange">trong vài giờ</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Người theo dõi</span>
                    <span className="text-shopee-orange">{formatNumber(shop?.follower_count || 15000)}</span>
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
