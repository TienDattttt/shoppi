import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, Star, Users, Clock, MapPin } from "lucide-react";
import { useChatStore } from "@/store/chatStore";

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
}

export function ShopHeader({ shop }: ShopHeaderProps) {
    const { openChatWithShop } = useChatStore();

    const handleChat = () => {
        openChatWithShop(shop.id, shop.name, shop.avatar);
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
                                    <span className="opacity-80">Online 5 minutes ago</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-white text-white hover:bg-white/20 hover:text-white"
                                    onClick={handleChat}
                                >
                                    <MessageCircle className="h-4 w-4 mr-1" /> Chat Now
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-8 bg-white text-black hover:bg-gray-100"
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Follow
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="container mx-auto px-4 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-gray-100 text-sm">
                    <div className="flex items-center gap-3 px-2">
                        <Star className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Rating</div>
                            <div className="text-shopee-orange font-medium">{shop.rating} / 5.0</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                        <Users className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Followers</div>
                            <div className="font-medium">{(shop.followers / 1000).toFixed(1)}k</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                        <Clock className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Response Rate</div>
                            <div className="font-medium">{shop.responseRate}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                        <MapPin className="h-5 w-5 text-shopee-orange" />
                        <div>
                            <div className="text-gray-500">Joined</div>
                            <div className="font-medium">{shop.joinedDate}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
