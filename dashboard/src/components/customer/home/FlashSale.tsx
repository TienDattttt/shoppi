import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Timer } from "lucide-react";
import { ProductCard, type Product } from "../product/ProductCard";
import { productService } from "@/services/product.service";

export function FlashSale() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const fetchFlashSaleProducts = async () => {
            try {
                const response = await productService.searchProducts({
                    limit: 12,
                    sortBy: 'total_sold',
                    sortOrder: 'desc',
                });
                
                // Response format: { data: [...], pagination: {...} }
                const apiProducts = Array.isArray(response) ? response : (response?.data || []);
                const transformed: Product[] = apiProducts
                    .filter((p: any) => {
                        const comparePrice = p.compareAtPrice || p.compare_at_price;
                        const basePrice = p.basePrice || p.base_price;
                        return comparePrice && comparePrice > basePrice;
                    })
                    .slice(0, 6)
                    .map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        slug: p.slug,
                        price: p.basePrice || p.base_price,
                        originalPrice: p.compareAtPrice || p.compare_at_price,
                        image: p.images?.[0]?.url || p.imageUrl || 'https://via.placeholder.com/200',
                        rating: p.avgRating || p.avg_rating || 0,
                        soldCount: p.totalSold || p.total_sold || 0,
                        shopLocation: p.shop?.city || 'Việt Nam',
                    }));
                setProducts(transformed);
            } catch (error) {
                console.error('Failed to fetch flash sale products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFlashSaleProducts();
    }, []);

    useEffect(() => {
        // Set target time to next integer hour + 2 hours
        const target = new Date();
        target.setHours(target.getHours() + 2);
        target.setMinutes(0);
        target.setSeconds(0);

        const interval = setInterval(() => {
            const now = new Date();
            const difference = target.getTime() - now.getTime();

            if (difference <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
            } else {
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft({ hours, minutes, seconds });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (unit: number) => unit.toString().padStart(2, '0');

    if (loading) {
        return (
            <div className="bg-white rounded-sm shadow-sm p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <div className="text-shopee-orange font-bold text-xl uppercase italic flex items-center gap-2">
                            <Timer className="h-6 w-6" />
                            Flash Sale
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-[180px] shrink-0">
                            <div className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
                            <div className="h-4 bg-gray-200 animate-pulse rounded mt-2" />
                            <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded mt-1" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <div className="bg-white rounded-sm shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <div className="text-shopee-orange font-bold text-xl uppercase italic flex items-center gap-2">
                        <Timer className="h-6 w-6" />
                        Flash Sale
                    </div>
                    <div className="flex gap-1 text-white font-bold text-center">
                        <div className="bg-black px-1.5 py-0.5 rounded-sm min-w-[30px]">{formatTime(timeLeft.hours)}</div>
                        <span className="text-black font-normal">:</span>
                        <div className="bg-black px-1.5 py-0.5 rounded-sm min-w-[30px]">{formatTime(timeLeft.minutes)}</div>
                        <span className="text-black font-normal">:</span>
                        <div className="bg-black px-1.5 py-0.5 rounded-sm min-w-[30px]">{formatTime(timeLeft.seconds)}</div>
                    </div>
                </div>
                <Link to="/flash-sale" className="text-shopee-orange flex items-center gap-1 hover:opacity-80 font-medium text-sm">
                    Xem tất cả <ChevronRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {products.map(product => (
                    <div key={product.id} className="w-[180px] shrink-0">
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>
        </div>
    );
}
