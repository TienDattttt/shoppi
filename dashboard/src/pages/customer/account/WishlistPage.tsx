import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2, Loader2, TrendingDown, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { productService } from "@/services/product.service";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

interface WishlistItem {
    id: string;
    productId: string;
    addedAt: string;
    priceAtAdd: number;
    currentPrice: number;
    hasPriceDrop: boolean;
    priceDropAmount: number;
    product: {
        id: string;
        name: string;
        slug: string;
        short_description: string | null;
        base_price: number;
        compare_at_price: number | null;
        currency: string;
        avg_rating: number;
        review_count: number;
        status: string;
    };
}

interface WishlistResponse {
    data: WishlistItem[];
    count: number;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export default function WishlistPage() {
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
    const [addingToCartIds, setAddingToCartIds] = useState<Set<string>>(new Set());
    const { addItem } = useCartStore();

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const response: WishlistResponse = await productService.getWishlist();
            setWishlist(response.data || []);
        } catch (error) {
            console.error("Failed to fetch wishlist:", error);
            toast.error("Không thể tải danh sách yêu thích");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (productId: string) => {
        setRemovingIds(prev => new Set(prev).add(productId));
        try {
            await productService.removeFromWishlist(productId);
            setWishlist(prev => prev.filter(item => item.productId !== productId));
            toast.success("Đã xóa khỏi danh sách yêu thích");
        } catch (error) {
            console.error("Failed to remove from wishlist:", error);
            toast.error("Không thể xóa sản phẩm");
        } finally {
            setRemovingIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    const handleAddToCart = async (item: WishlistItem) => {
        setAddingToCartIds(prev => new Set(prev).add(item.productId));
        try {
            // Get full product details to get variant info
            const productData = await productService.getProductById(item.productId);
            const product = productData.product || productData;
            
            // Get default variant
            const defaultVariant = product.variants?.[0];
            if (!defaultVariant) {
                toast.error("Sản phẩm không có phiên bản nào");
                return;
            }

            await addItem(item.productId, defaultVariant.id, 1);
            toast.success("Đã thêm vào giỏ hàng");
        } catch (error: any) {
            console.error("Failed to add to cart:", error);
            toast.error(error.message || "Không thể thêm vào giỏ hàng");
        } finally {
            setAddingToCartIds(prev => {
                const next = new Set(prev);
                next.delete(item.productId);
                return next;
            });
        }
    };

    // Count items with price drops
    const priceDropCount = wishlist.filter(item => item.hasPriceDrop).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-sm shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Heart className="h-6 w-6 text-shopee-orange fill-shopee-orange" />
                        <h1 className="text-xl font-medium">Sản phẩm yêu thích</h1>
                        <span className="text-gray-500">({wishlist.length} sản phẩm)</span>
                    </div>
                    {priceDropCount > 0 && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-sm font-medium">{priceDropCount} sản phẩm giảm giá!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Wishlist Items */}
            {wishlist.length === 0 ? (
                <div className="bg-white p-12 rounded-sm shadow-sm text-center">
                    <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-lg font-medium text-gray-700 mb-2">
                        Chưa có sản phẩm yêu thích
                    </h2>
                    <p className="text-gray-500 mb-6">
                        Hãy thêm sản phẩm vào danh sách yêu thích để theo dõi giá và mua sau
                    </p>
                    <Link to="/">
                        <Button className="bg-shopee-orange hover:bg-shopee-orange/90">
                            Khám phá sản phẩm
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {wishlist.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-sm shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
                        >
                            {/* Product Image */}
                            <Link to={`/product/${item.product.slug}`} className="block relative">
                                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                                    <Package className="h-12 w-12 text-gray-300" />
                                </div>
                                {/* Price Drop Badge */}
                                {item.hasPriceDrop && (
                                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" />
                                        Giảm {formatCurrency(item.priceDropAmount)}
                                    </div>
                                )}
                            </Link>

                            {/* Product Info */}
                            <div className="p-4">
                                <Link to={`/product/${item.product.slug}`}>
                                    <h3 className="font-medium text-sm line-clamp-2 hover:text-shopee-orange transition-colors mb-2">
                                        {item.product.name}
                                    </h3>
                                </Link>

                                {/* Price */}
                                <div className="mb-3">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-shopee-orange font-bold text-lg">
                                            {formatCurrency(item.currentPrice)}
                                        </span>
                                        {item.hasPriceDrop && (
                                            <span className="text-gray-400 text-sm line-through">
                                                {formatCurrency(item.priceAtAdd)}
                                            </span>
                                        )}
                                    </div>
                                    {item.product.compare_at_price && item.product.compare_at_price > item.currentPrice && (
                                        <div className="text-xs text-gray-500">
                                            Giá gốc: {formatCurrency(item.product.compare_at_price)}
                                        </div>
                                    )}
                                </div>

                                {/* Rating */}
                                {item.product.avg_rating > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                                        <span className="text-yellow-500">★</span>
                                        <span>{item.product.avg_rating.toFixed(1)}</span>
                                        <span>({item.product.review_count} đánh giá)</span>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-shopee-orange hover:bg-shopee-orange/90 gap-1"
                                        onClick={() => handleAddToCart(item)}
                                        disabled={addingToCartIds.has(item.productId)}
                                    >
                                        {addingToCartIds.has(item.productId) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <ShoppingCart className="h-4 w-4" />
                                                Thêm vào giỏ
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleRemove(item.productId)}
                                        disabled={removingIds.has(item.productId)}
                                    >
                                        {removingIds.has(item.productId) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
