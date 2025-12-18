import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { FilterSidebar } from "@/components/customer/search/FilterSidebar";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { ProductCard, type Product } from "@/components/customer/product/ProductCard";
import { productService } from "@/services/product.service";
import { Loader2 } from "lucide-react";

export default function CategoryPage() {
    const { slug } = useParams(); // This is the category ID from the route /categories/:slug
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [categoryName, setCategoryName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [totalProducts, setTotalProducts] = useState(0);

    useEffect(() => {
        const fetchCategoryProducts = async () => {
            if (!slug) return;
            
            setLoading(true);
            try {
                // Fetch category info
                const categoryRes = await productService.getCategoryById(slug);
                setCategoryName(categoryRes.data?.name || categoryRes.name || `Category ${slug}`);

                // Fetch products in this category
                const params: Record<string, any> = {
                    categoryId: slug,
                    page: searchParams.get('page') || 1,
                    limit: 20,
                };
                
                // Add filter params
                const minPrice = searchParams.get('minPrice');
                const maxPrice = searchParams.get('maxPrice');
                const sort = searchParams.get('sort');
                
                if (minPrice) params.minPrice = minPrice;
                if (maxPrice) params.maxPrice = maxPrice;
                if (sort) params.sort = sort;

                const res = await productService.searchProducts(params);
                const productData = res.data?.products || res.products || [];
                
                setProducts(productData.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug || p.id,
                    price: p.price || p.minPrice || 0,
                    originalPrice: p.originalPrice,
                    image: p.images?.[0] || p.thumbnail || 'https://placehold.co/300x300?text=No+Image',
                    rating: p.avgRating || p.rating || 0,
                    soldCount: p.soldCount || 0,
                    shopLocation: p.shop?.city || p.shopLocation || '',
                    isMall: p.shop?.isMall || false,
                    discount: p.discount,
                })));
                setTotalProducts(res.data?.total || res.total || productData.length);
            } catch (error) {
                console.error("Failed to fetch category products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategoryProducts();
    }, [slug, searchParams]);

    return (
        <div className="container mx-auto px-4 py-8">
            <Breadcrumbs items={[
                { label: "Trang chủ", href: "/" }, 
                { label: "Danh mục", href: "#" }, 
                { label: categoryName || `Category ${slug}` }
            ]} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
                {/* Filter Sidebar */}
                <div className="hidden lg:block">
                    <FilterSidebar />
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">{categoryName || `Category ${slug}`}</h1>
                        <span className="text-sm text-muted-foreground">{totalProducts} sản phẩm</span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            Không có sản phẩm nào trong danh mục này
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
