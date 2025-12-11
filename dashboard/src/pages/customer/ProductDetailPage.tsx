import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProductGallery } from "../../components/customer/product/ProductGallery";
import { ProductInfo } from "../../components/customer/product/ProductInfo";
import { ShopInfo } from "../../components/customer/product/ShopInfo";
import { ProductReviews } from "../../components/customer/product/ProductReviews";
import { ProductCard, type Product as CardProduct } from "../../components/customer/product/ProductCard";
import { productService } from "@/services/product.service";
import { Skeleton } from "@/components/ui/skeleton";

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

interface ProductDetail {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    rating: number;
    reviewCount: number;
    soldCount: number;
    stock: number;
    images: string[];
    variantGroups: { id: string; name: string; options: string[] }[];
    rawVariants: ProductVariant[];
    description?: string;
    shop?: {
        id: string;
        name: string;
        city?: string;
    };
    category?: {
        id: string;
        name: string;
        slug: string;
    };
}

export default function ProductDetailPage() {
    const { slug } = useParams();
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<CardProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!slug) return;
            
            setLoading(true);
            setError(null);
            
            try {
                // Fetch product by slug (backend accepts both id and slug)
                const response = await productService.getProductById(slug);
                // Response format: { data: {...} }
                const p = response?.data || response;

                // Transform to ProductDetail format - handle both camelCase and snake_case
                const images = p.images?.map((img: any) => img.url) || [];
                
                // Group variants by attribute type for UI display
                const variantGroupsMap: Record<string, Set<string>> = {};
                const rawVariants: ProductVariant[] = (p.variants || []).map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    sku: v.sku,
                    price: v.price || p.basePrice || p.base_price,
                    compareAtPrice: v.compareAtPrice || v.compare_at_price,
                    quantity: v.quantity || v.availableQuantity || 0,
                    imageUrl: v.imageUrl || v.image_url,
                    attributes: v.attributes || {},
                }));
                
                rawVariants.forEach((v) => {
                    if (v.attributes) {
                        Object.entries(v.attributes).forEach(([key, value]) => {
                            if (!variantGroupsMap[key]) variantGroupsMap[key] = new Set();
                            variantGroupsMap[key].add(value as string);
                        });
                    }
                });
                
                const variantGroups = Object.entries(variantGroupsMap).map(([name, options], idx) => ({
                    id: `v${idx}`,
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    options: Array.from(options),
                }));

                // Calculate total stock from variants
                const totalStock = rawVariants.reduce((sum, v) => sum + v.quantity, 0);

                // Shop info - handle both camelCase and snake_case
                const shopInfo = p.shop ? {
                    id: p.shop.id,
                    name: p.shop.name || p.shop.shop_name,
                    city: p.shop.city,
                } : undefined;

                setProduct({
                    id: p.id,
                    name: p.name,
                    price: p.basePrice || p.base_price,
                    originalPrice: p.compareAtPrice || p.compare_at_price || undefined,
                    rating: p.avgRating || p.avg_rating || 0,
                    reviewCount: p.reviewCount || p.review_count || 0,
                    soldCount: p.totalSold || p.total_sold || 0,
                    stock: totalStock,
                    images: images.length > 0 ? images : ['https://placehold.co/500x500?text=No+Image'],
                    variantGroups,
                    rawVariants,
                    description: p.description,
                    shop: shopInfo,
                    category: p.category,
                });

                // Fetch related products (same category)
                if (p.category_id) {
                    const relatedResponse = await productService.searchProducts({
                        categoryId: p.category_id,
                        limit: 6,
                        status: 'active',
                    });
                    // Response format: { data: [...], pagination: {...} }
                    const relatedArray = Array.isArray(relatedResponse) ? relatedResponse : (relatedResponse?.data || []);
                    const relatedList = relatedArray
                        .filter((rp: any) => rp.id !== p.id)
                        .slice(0, 6)
                        .map((rp: any) => ({
                            id: rp.id,
                            name: rp.name,
                            slug: rp.slug,
                            price: rp.basePrice || rp.base_price,
                            originalPrice: rp.compareAtPrice || rp.compare_at_price || undefined,
                            image: rp.images?.[0]?.url || rp.imageUrl || 'https://placehold.co/300x300?text=No+Image',
                            rating: rp.avgRating || rp.avg_rating || 0,
                            soldCount: rp.totalSold || rp.total_sold || 0,
                            shopLocation: rp.shop?.city || 'Việt Nam',
                        }));
                    setRelatedProducts(relatedList);
                }
            } catch (err: any) {
                console.error('Failed to fetch product:', err);
                setError('Không tìm thấy sản phẩm');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [slug]);

    if (loading) {
        return (
            <div className="bg-gray-50 pb-12">
                <div className="container mx-auto px-4 py-4 space-y-4">
                    <Skeleton className="h-4 w-1/2" />
                    <div className="bg-white p-4 md:p-8 rounded-sm shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                            <div className="md:col-span-5">
                                <Skeleton className="aspect-square w-full" />
                            </div>
                            <div className="md:col-span-7 space-y-4">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-12 w-1/2" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-700">{error || 'Không tìm thấy sản phẩm'}</h2>
                </div>
            </div>
        );
    }


    return (
        <div className="bg-gray-50 pb-12">
            <div className="container mx-auto px-4 py-4 space-y-4">
                {/* Breadcrumbs */}
                <div className="text-sm text-gray-500 mb-2">
                    Shoppi &gt; {product.category?.name || 'Sản phẩm'} &gt; {product.name}
                </div>

                {/* Main Product Section */}
                <div className="bg-white p-4 md:p-8 rounded-sm shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Gallery - 5 cols */}
                        <div className="md:col-span-5">
                            <ProductGallery images={product.images} />
                        </div>

                        {/* Info - 7 cols */}
                        <div className="md:col-span-7">
                            <ProductInfo product={product} />
                        </div>
                    </div>
                </div>

                {/* Shop Info */}
                <ShopInfo shop={product.shop} />

                {/* Reviews & Description */}
                <ProductReviews productId={product.id} description={product.description} />

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-lg font-medium mb-4 uppercase text-gray-500">Có thể bạn cũng thích</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {relatedProducts.map(p => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
