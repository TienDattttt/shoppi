import { useState } from "react";
import { Star, Minus, Plus, ShoppingCart, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rating } from "../common/Rating";
import { Price } from "../common/Price";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Variant {
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
        variants?: Variant[];
        stock: number;
    };
}

export function ProductInfo({ product }: ProductInfoProps) {
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);

    const handleVariantSelect = (variantName: string, option: string) => {
        setSelectedVariants(prev => ({
            ...prev,
            [variantName]: option
        }));
    };

    const handleQuantityChange = (delta: number) => {
        const newQty = quantity + delta;
        if (newQty >= 1 && newQty <= product.stock) {
            setQuantity(newQty);
        }
    };

    const handleAddToCart = () => {
        // Validate variants
        if (product.variants && product.variants.length > 0) {
            const missingVariant = product.variants.find(v => !selectedVariants[v.name]);
            if (missingVariant) {
                toast.error(`Please select ${missingVariant.name}`);
                return;
            }
        }
        toast.success("Added to cart successfully!");
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-xl md:text-2xl font-medium">{product.name}</h1>

            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-shopee-orange border-r pr-4 border-gray-300">
                    <span className="underline font-bold text-base">{product.rating}</span>
                    <Rating value={product.rating} size={14} />
                </div>
                <div className="border-r pr-4 border-gray-300">
                    <span className="font-bold text-base border-b border-black pb-[1px]">{product.reviewCount}</span>
                    <span className="text-muted-foreground ml-1">Ratings</span>
                </div>
                <div>
                    <span className="font-bold text-base">{product.soldCount}</span>
                    <span className="text-muted-foreground ml-1">Sold</span>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-sm">
                <Price
                    price={product.price}
                    originalPrice={product.originalPrice}
                    className="text-3xl font-medium text-shopee-orange"
                />
            </div>

            {/* Variants */}
            {product.variants?.map((variant) => (
                <div key={variant.id} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-10 text-sm">
                    <span className="text-muted-foreground min-w-20">{variant.name}</span>
                    <div className="flex flex-wrap gap-2">
                        {variant.options.map((option) => (
                            <button
                                key={option}
                                onClick={() => handleVariantSelect(variant.name, option)}
                                className={cn(
                                    "px-4 py-2 border rounded-sm min-w-[5rem] transition-colors",
                                    selectedVariants[variant.name] === option
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
                <span className="text-muted-foreground min-w-20">Quantity</span>
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
                        disabled={quantity >= product.stock}
                    >
                        <Plus className="h-3 w-3" />
                    </button>
                    <span className="ml-4 text-xs text-muted-foreground">{product.stock} pieces available</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-8">
                <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-8 border-shopee-orange text-shopee-orange hover:bg-orange-50"
                    onClick={handleAddToCart}
                >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add To Cart
                </Button>
                <Button
                    size="lg"
                    className="h-12 px-12 bg-shopee-orange hover:bg-shopee-orange-hover text-white"
                >
                    Buy Now
                </Button>
            </div>

            <div className="border-t pt-6 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-1 hover:text-shopee-orange">
                        <Heart className="h-4 w-4" /> Favorite ({Math.floor(product.soldCount / 2)})
                    </button>
                    <button className="flex items-center gap-1 hover:text-shopee-orange">
                        <Share2 className="h-4 w-4" /> Share
                    </button>
                </div>
            </div>
        </div>
    );
}
