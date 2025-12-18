import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { productService } from "@/services/product.service";
import { Skeleton } from "@/components/ui/skeleton";

interface TopProduct {
    id: string;
    name: string;
    soldCount: number;
    image: string;
}

export function TopSearchSection() {
    const [products, setProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopProducts = async () => {
            try {
                const res = await productService.searchProducts({
                    sort: 'best_selling',
                    limit: 6,
                });
                const productData = res.data?.products || res.products || [];
                setProducts(productData.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    soldCount: p.soldCount || 0,
                    image: p.images?.[0] || p.thumbnail || 'https://placehold.co/120x160?text=No+Image',
                })));
            } catch (error) {
                console.error("Failed to fetch top products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTopProducts();
    }, []);

    const formatSoldCount = (count: number) => {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(0)}k+ đã bán`;
        }
        return `${count} đã bán`;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-sm shadow-sm p-4 mb-4">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-shopee-orange font-bold text-lg uppercase">Sản phẩm bán chạy</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="aspect-[3/4] rounded-sm" />
                    ))}
                </div>
            </div>
        );
    }

    if (products.length === 0) {
        return null; // Don't show section if no products
    }

    return (
        <div className="bg-white rounded-sm shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-shopee-orange font-bold text-lg uppercase">Sản phẩm bán chạy</h3>
                <Link to="/search?sort=best_selling" className="text-shopee-orange text-sm font-medium">Xem tất cả</Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {products.map((item, index) => (
                    <Link key={item.id} to={`/products/${item.id}`} className="group relative block aspect-[3/4] rounded-sm overflow-hidden bg-gray-100">
                        <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                            <div className="text-white font-medium text-sm line-clamp-1">{item.name}</div>
                            <div className="text-gray-300 text-xs">{formatSoldCount(item.soldCount)}</div>
                        </div>
                        {/* Top Badge */}
                        <div className="absolute top-0 left-0 bg-shopee-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-br-sm z-10">
                            TOP {index + 1}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
