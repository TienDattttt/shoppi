import { useState, useEffect } from "react";
import { ProductCard, type Product } from "../product/ProductCard";
import { Button } from "@/components/ui/button";
import { productService } from "@/services/product.service";

export function TodaySuggestions() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const transformProducts = (apiProducts: any[]): Product[] => {
        return apiProducts.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.basePrice || p.base_price,
            originalPrice: p.compareAtPrice || p.compare_at_price || undefined,
            image: p.images?.[0]?.url || p.imageUrl || 'https://via.placeholder.com/300',
            rating: p.avgRating || p.avg_rating || 0,
            soldCount: p.totalSold || p.total_sold || 0,
            shopLocation: p.shop?.city || 'Việt Nam',
            isMall: false,
        }));
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await productService.searchProducts({
                    page: 1,
                    limit: 12,
                    status: 'active',
                });
                // Response format: { data: [...], pagination: {...} }
                const apiProducts = Array.isArray(response) ? response : (response?.data || []);
                setProducts(transformProducts(apiProducts));
                setHasMore(apiProducts.length >= 12);
            } catch (error) {
                console.error('Failed to fetch products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const data = await productService.searchProducts({
                page: nextPage,
                limit: 12,
                status: 'active',
            });
            // Response format: { data: [...], pagination: {...} }
            const apiProducts = Array.isArray(data) ? data : (data?.data || []);
            if (apiProducts.length > 0) {
                setProducts(prev => [...prev, ...transformProducts(apiProducts)]);
                setPage(nextPage);
                setHasMore(apiProducts.length >= 12);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to load more products:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return (
            <div className="mt-8">
                <div className="flex items-center justify-center mb-6">
                    <h3 className="text-shopee-orange font-bold text-xl uppercase border-b-4 border-shopee-orange pb-1 px-4">
                        GỢI Ý HÔM NAY
                    </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg overflow-hidden">
                            <div className="aspect-square bg-gray-200 animate-pulse" />
                            <div className="p-3">
                                <div className="h-4 bg-gray-200 animate-pulse rounded mb-2" />
                                <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <div className="flex items-center justify-center mb-6">
                <h3 className="text-shopee-orange font-bold text-xl uppercase border-b-4 border-shopee-orange pb-1 px-4">
                    GỢI Ý HÔM NAY
                </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            {hasMore && (
                <div className="mt-8 text-center">
                    <Button
                        variant="outline"
                        className="w-full max-w-[400px] bg-white hover:bg-gray-50 text-gray-600 border-gray-300"
                        onClick={loadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? "Đang tải..." : "Xem thêm"}
                    </Button>
                </div>
            )}
        </div>
    );
}
