import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Store } from "lucide-react";
import { Link } from "react-router-dom";

export function ShopInfo() {
    return (
        <div className="bg-white p-6 rounded-sm shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center gap-4 border-r pr-6 border-gray-100 min-w-[300px]">
                <div className="relative">
                    <Avatar className="h-16 w-16 border">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>SP</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-shopee-orange text-white text-[10px] px-1 rounded-sm">
                        Official
                    </div>
                </div>
                <div>
                    <h3 className="font-medium text-lg">Shoppi Official Store</h3>
                    <p className="text-xs text-muted-foreground mb-2">Active 5 minutes ago</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs border-shopee-orange text-shopee-orange hover:bg-orange-50 bg-orange-50/50">
                            <MessageCircle className="mr-1 h-3 w-3" /> Chat Now
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                            <Store className="mr-1 h-3 w-3" /> View Shop
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-2 text-sm">
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Ratings</span>
                    <span className="text-shopee-orange">56.2k</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Response Rate</span>
                    <span className="text-shopee-orange">98%</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Joined</span>
                    <span className="text-shopee-orange">4 years ago</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Products</span>
                    <span className="text-shopee-orange">452</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Response Time</span>
                    <span className="text-shopee-orange">within hours</span>
                </div>
                <div className="space-y-1">
                    <span className="text-muted-foreground mr-2">Followers</span>
                    <span className="text-shopee-orange">1.2M</span>
                </div>
            </div>
        </div>
    );
}
