import { useState, useEffect } from "react";
import { ProductCard, type Product } from "../product/ProductCard";
import { Button } from "@/components/ui/button";

const MOCK_PRODUCTS: Product[] = [
    { id: "1", name: "Classic White T-Shirt", price: 150000, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300", slug: "classic-white-t-shirt", rating: 4.5, soldCount: 120, shopLocation: "Hanoi" },
    { id: "2", name: "Denim Jacket", price: 450000, originalPrice: 600000, image: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=300", slug: "denim-jacket", rating: 4.8, soldCount: 450, shopLocation: "HCM", isMall: true },
    { id: "3", name: "Running Shoes", price: 890000, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300", slug: "running-shoes", rating: 4.7, soldCount: 890, shopLocation: "Danang" },
    { id: "4", name: "Leather Wallet", price: 290000, image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=300", slug: "leather-wallet", rating: 4.6, soldCount: 230, shopLocation: "Hanoi" },
    { id: "5", name: "Sunglasses", price: 190000, originalPrice: 300000, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300", slug: "sunglasses", rating: 4.4, soldCount: 150, shopLocation: "HCM" },
    { id: "6", name: "Wrist Watch", price: 1200000, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300", slug: "wrist-watch", rating: 4.9, soldCount: 560, shopLocation: "Hanoi", isMall: true },
    { id: "7", name: "Backpack", price: 350000, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300", slug: "backpack", rating: 4.5, soldCount: 340, shopLocation: "Danang" },
    { id: "8", name: "Wireless Headphones", price: 590000, originalPrice: 900000, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300", slug: "wireless-headphones", rating: 4.7, soldCount: 1200, shopLocation: "Hanoi" },
    { id: "9", name: "Gaming Mouse", price: 450000, image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300", slug: "gaming-mouse", rating: 4.6, soldCount: 670, shopLocation: "HCM" },
    { id: "10", name: "Mechanical Keyboard", price: 1500000, image: "https://images.unsplash.com/photo-1587829741301-dc798b91a603?w=300", slug: "mechanical-keyboard-rgb", rating: 4.9, soldCount: 890, shopLocation: "Hanoi", isMall: true },
    { id: "11", name: "Smart Band", price: 350000, image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300", slug: "smart-band", rating: 4.4, soldCount: 2100, shopLocation: "HCM" },
    { id: "12", name: "Portable Speaker", price: 290000, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300", slug: "portable-speaker", rating: 4.5, soldCount: 430, shopLocation: "Danang" },
];

export function TodaySuggestions() {
    const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
    const [loading, setLoading] = useState(false);

    // Simulate Infinite Scroll loading
    const loadMore = () => {
        setLoading(true);
        setTimeout(() => {
            // Append same mock products with new IDs to simulate loading more
            const moreProducts = MOCK_PRODUCTS.map(p => ({ ...p, id: p.id + Date.now() }));
            setProducts(prev => [...prev, ...moreProducts]);
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="mt-8">
            <div className="flex items-center justify-center mb-6">
                <h3 className="text-shopee-orange font-bold text-xl uppercase border-b-4 border-shopee-orange pb-1 px-4">
                    TODAY'S SUGGESTIONS
                </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            <div className="mt-8 text-center">
                <Button
                    variant="outline"
                    className="w-full max-w-[400px] bg-white hover:bg-gray-50 text-gray-600 border-gray-300"
                    onClick={loadMore}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "See More"}
                </Button>
            </div>
        </div>
    );
}
