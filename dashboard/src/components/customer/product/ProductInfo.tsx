import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rating } from "../common/Rating";
import { Price } from "../common/Price";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

interface ProductVariant {
    id: string;
    name: string | null;
    sku: string | null;
    price: number;
    compareAtPrice?: number;
    quantity: number;
    imageUrl: string | null;
    attributes: Record<string, string>;
}

interface VariantGroup {
    id: string;
    name: string;
    options: string[];
}

interface ProductInfoProps {
    product: {
        id: string;
        name: string;
        price: number;
        originalPrice?: number;
        rating: number;
        reviewCount: number;
        soldCount: number;
        variantGroups?: VariantGroup[];
        rawVariants?: ProductVariant[];
        stock: number;
        images?: string[];
        shop?: {
            id: string;
            name: string;
            city?: string;
        };
    };
}

export function ProductInfo({ product }: ProductInfoProps) {
    const navigate = useNavigate();
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [buyNowLoading, setBuyNowLoading] = useState(false);
    
    const { addToCart } = useCartStore();
    const { token } = useAuthStore();

    // Find matching variant based on selected attributes
    const selectedVariant = useMemo(() => {
        if (!product.rawVariants || product.rawVariants.length === 0) {
            return null;
        }
        
        // If no variant groups (single variant product), return first variant
        if (!product.variantGroups || product.variantGroups.length === 0) {
            return product.rawVariants[0];
        }
        
        // Find variant matching all selected attributes
        const selectedKeys = Object.keys(selectedAttributes);
        if (selectedKeys.length === 0) return null;
        
        return product.rawVariants.find(v => {
            return selectedKeys.every(key => 
                v.attributes[key.toLowerCase()] === selectedAttributes[key] ||
                v.attributes[key] === selectedAttributes[key]
            );
        }) || null;
    }, [product.rawVariants, product.variantGroups, selectedAttributes]);

    // Current price and stock based on selected variant
    const currentPrice = selectedVariant?.price || product.price;
    const currentOriginalPrice = selectedVariant?.compareAtPrice || product.originalPrice;
    const currentStock = selectedVariant?.quantity || product.stock;

    const handleAttributeSelect = (attributeName: string, option: string) => {
        setSelectedAttributes(prev => ({
            ...prev,
            [attributeName]: option
        }));
        setQuantity(1); // Reset quantity when variant changes
    };

    const handleQuantityChange = (delta: number) => {
        const newQty = quantity + delta;
        if (newQty >= 1 && newQty <= currentStock) {
            setQuantity(newQty);
        }
    };

    const handleAddToCart = async () => {
        if (!token) {
            toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
            return;
        }

        // Validate variant selection
        if (product.variantGroups && product.variantGroups.length > 0) {
            const missingAttribute = product.variantGroups.find(vg => !selectedAttributes[vg.name]);
            if (missingAttribute) {
                toast.error(`Vui lòng chọn ${missingAttribute.name}`);
                return;
            }
        }

        // Get variant ID
        let variantId: string;
        if (selectedVariant) {
            variantId = selectedVariant.id;
        } else if (product.rawVariants && product.rawVariants.length > 0) {
            variantId = product.rawVariants[0].id;
        } else {
            toast.error("Sản phẩm không có biến thể");
            return;
        }

        if (currentStock < quantity) {
            toast.error(`Chỉ còn ${currentStock} sản phẩm`);
            return;
        }

        setLoading(true);
        try {
            await addToCart({
                productId: product.id,
                variantId,
                quantity,
                name: product.name,
                price: currentPrice,
                originalPrice: currentOriginalPrice,
                image: selectedVariant?.imageUrl || product.images?.[0] || '',
                variant: Object.values(selectedAttributes).join(', ') || undefined,
                shopId: product.shop?.id || '',
                shopName: product.shop?.name || 'Shop',
                stock: currentStock,
            });
            toast.success("Đã thêm vào giỏ hàng!");
        } catch (error: any) {
            toast.error(error.message || "Không thể thêm vào giỏ hàng");
        } finally {
            setLoading(false);
        }
    };

    const handleBuyNow = async () => {
        if (!token) {
            toast.error("Vui lòng đăng nhập để mua hàng");
            return;
        }

        // Validate variant selection
        if (product.variantGroups && product.variantGroups.length > 0) {
            const missingAttribute = product.variantGroups.find(vg => !selectedAttributes[vg.name]);
            if (missingAttribute) {
                toast.error(`Vui lòng chọn ${missingAttribute.name}`);
                return;
            }
        }

        // Get variant ID
        let variantId: string;
        if (selectedVariant) {
            variantId = selectedVariant.id;
        } else if (product.rawVariants && product.rawVariants.length > 0) {
            variantId = product.rawVariants[0].id;
        } else {
            toast.error("Sản phẩm không có biến thể");
            return;
        }

        if (currentStock < quantity) {
            toast.error(`Chỉ còn ${currentStock} sản phẩm`);
            return;
        }

        setBuyNowLoading(true);
        try {
            // Add to cart first
            await addToCart({
                productId: product.id,
                variantId,
                quantity,
                name: product.name,
                price: currentPrice,
                originalPrice: currentOriginalPrice,
                image: selectedVariant?.imageUrl || product.images?.[0] || '',
                variant: Object.values(selectedAttributes).join(', ') || undefined,
                shopId: product.shop?.id || '',
                shopName: product.shop?.name || 'Shop',
                stock: currentStock,
            });
            
            // Navigate to cart page to proceed to checkout
            navigate('/cart');
        } catch (error: any) {
            toast.error(error.message || "Không thể mua ngay");
        } finally {
            setBuyNowLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-xl md:text-2xl font-medium">{product.name}</h1>

            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-shopee-orange border-r pr-4 border-gray-300">
                    <span className="underline font-bold text-base">{product.rating.toFixed(1)}</span>
                    <Rating value={product.rating} size={14} />
                </div>
                <div className="border-r pr-4 border-gray-300">
                    <span className="font-bold text-base border-b border-black pb-[1px]">{product.reviewCount}</span>
                    <span className="text-muted-foreground ml-1">Đánh giá</span>
                </div>
                <div>
                    <span className="font-bold text-base">{product.soldCount}</span>
                    <span className="text-muted-foreground ml-1">Đã bán</span>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-sm">
                <Price
                    price={currentPrice}
                    originalPrice={currentOriginalPrice}
                    className="text-3xl font-medium text-shopee-orange"
                />
            </div>

            {/* Variant Groups */}
            {product.variantGroups?.map((vg) => (
                <div key={vg.id} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-10 text-sm">
                    <span className="text-muted-foreground min-w-20">{vg.name}</span>
                    <div className="flex flex-wrap gap-2">
                        {vg.options.map((option) => (
                            <button
                                key={option}
                                onClick={() => handleAttributeSelect(vg.name, option)}
                                className={cn(
                                    "px-4 py-2 border rounded-sm min-w-[5rem] transition-colors",
                                    selectedAttributes[vg.name] === option
                                        ? "border-shopee-orange text-shopee-orange bg-orange-50"
                                        : "border-gray-200 hover:border-shopee-orange"
                                )}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {/* Quantity */}
            <div className="flex items-center gap-10 text-sm mt-4">
                <span className="text-muted-foreground min-w-20">Số lượng</span>
                <div className="flex items-center">
                    <button
                        onClick={() => handleQuantityChange(-1)}
                        className="w-8 h-8 flex items-center justify-center border border-r-0 rounded-l-sm hover:bg-gray-50"
                        disabled={quantity <= 1}
                    >
                        <Minus className="h-3 w-3" />
                    </button>
                    <input
                        type="text"
                        value={quantity}
                        readOnly
                        className="w-12 h-8 border-y text-center focus:outline-none"
                    />
                    <button
                        onClick={() => handleQuantityChange(1)}
                        className="w-8 h-8 flex items-center justify-center border border-l-0 rounded-r-sm hover:bg-gray-50"
                        disabled={quantity >= currentStock}
                    >
                        <Plus className="h-3 w-3" />
                    </button>
                    <span className="ml-4 text-xs text-muted-foreground">{currentStock} sản phẩm có sẵn</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-8">
                <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-8 border-shopee-orange text-shopee-orange hover:bg-orange-50"
                    onClick={handleAddToCart}
                    disabled={loading || currentStock === 0}
                >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {loading ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                </Button>
                <Button
                    size="lg"
                    className="h-12 px-12 bg-shopee-orange hover:bg-shopee-orange-hover text-white"
                    disabled={currentStock === 0 || buyNowLoading}
                    onClick={handleBuyNow}
                >
                    {buyNowLoading ? "Đang xử lý..." : "Mua ngay"}
                </Button>
            </div>

            {currentStock === 0 && (
                <p className="text-red-500 text-sm">Sản phẩm tạm hết hàng</p>
            )}

            <div className="border-t pt-6 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-1 hover:text-shopee-orange">
                        <Heart className="h-4 w-4" /> Yêu thích ({Math.floor(product.soldCount / 2)})
                    </button>
                    <button className="flex items-center gap-1 hover:text-shopee-orange">
                        <Share2 className="h-4 w-4" /> Chia sẻ
                    </button>
                </div>
            </div>
        </div>
    );
}
