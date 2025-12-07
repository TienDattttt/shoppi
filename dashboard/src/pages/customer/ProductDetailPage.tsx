import { useParams } from "react-router-dom";
import { ProductGallery } from "../../components/customer/product/ProductGallery";
import { ProductInfo } from "../../components/customer/product/ProductInfo";
import { ShopInfo } from "../../components/customer/product/ShopInfo";
import { ProductReviews } from "../../components/customer/product/ProductReviews";
import { ProductCard } from "../../components/customer/product/ProductCard";

// Mock Product Data
const PRODUCT = {
    id: "prod-1",
    name: "Apple MacBook Air 13 inch M1 2020 8GB/256GB - Genuine Apple Vietnam",
    price: 18990000,
    originalPrice: 22990000,
    rating: 4.8,
    reviewCount: 12500,
    soldCount: 35000,
    stock: 50,
    images: [
        "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca4?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=1000&auto=format&fit=crop"
    ],
    variants: [
        { id: "v1", name: "Color", options: ["Space Grey", "Silver", "Gold"] },
        { id: "v2", name: "Storage", options: ["256GB", "512GB"] }
    ]
};

const RELATED_PRODUCTS = Array.from({ length: 6 }).map((_, i) => ({
    id: `rel-${i}`,
    name: `Related Product ${i + 1}`,
    slug: `related-${i}`,
    price: 500000 * (i + 1),
    rating: 4.5,
    soldCount: 10 * (i + 1),
    image: `https://picsum.photos/seed/rel${i}/300/300`,
    shopLocation: "Hanoi"
}));

export default function ProductDetailPage() {
    const { slug } = useParams();

    return (
        <div className="bg-gray-50 pb-12">
            <div className="container mx-auto px-4 py-4 space-y-4">
                {/* Breadcrumbs (Mock) */}
                <div className="text-sm text-gray-500 mb-2">
                    Shopee  &gt;  Computers & Laptops  &gt;  Laptops  &gt;  {PRODUCT.name}
                </div>

                {/* Main Product Section */}
                <div className="bg-white p-4 md:p-8 rounded-sm shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Gallery - 5 cols */}
                        <div className="md:col-span-5">
                            <ProductGallery images={PRODUCT.images} />
                        </div>

                        {/* Info - 7 cols */}
                        <div className="md:col-span-7">
                            <ProductInfo product={PRODUCT} />
                        </div>
                    </div>
                </div>

                {/* Shop Info */}
                <ShopInfo />

                {/* Reviews & Description */}
                <ProductReviews />

                {/* Related Products */}
                <div className="mt-8">
                    <h2 className="text-lg font-medium mb-4 uppercase text-gray-500">You may also like</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {RELATED_PRODUCTS.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
