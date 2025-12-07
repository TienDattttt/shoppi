import { Link } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rating } from "../common/Rating";
import { Price } from "../common/Price";
import { DiscountBadge } from "../common/Badges";
import { cn } from "@/lib/utils";

export interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    originalPrice?: number;
    image: string;
    rating: number;
    soldCount: number;
    shopLocation: string;
    isMall?: boolean;
}

interface ProductCardProps {
    product: Product;
    className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
    return (
        <Link to={`/products/${product.slug}`}>
            <Card className={cn("overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow group border-transparent hover:border-primary/20", className)}>
                <div className="relative aspect-square bg-muted">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="object-cover w-full h-full"
                        loading="lazy"
                    />
                    {/* Hover Actions */}
                    <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 justify-center bg-black/10 backdrop-blur-sm">
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full" onClick={(e) => { e.preventDefault(); /* Add to cart */ }}>
                            <ShoppingCart className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full" onClick={(e) => { e.preventDefault(); /* Wishlist */ }}>
                            <Heart className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <CardContent className="p-3 flex-1 flex flex-col gap-2">
                    <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5em] group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>

                    <div className="flex items-center gap-1 mt-auto">
                        {product.isMall && (
                            <span className="bg-red-600 text-white text-[10px] font-bold px-1 rounded-sm">Mall</span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center">
                            {product.shopLocation}
                        </span>
                    </div>

                    <Rating value={product.rating} size={12} readonly />

                    <div className="flex items-center justify-between mt-1">
                        <Price price={product.price} originalPrice={product.originalPrice} size="sm" />
                        <span className="text-[10px] text-muted-foreground">Sold {product.soldCount}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
