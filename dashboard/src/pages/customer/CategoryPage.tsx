import { useParams } from "react-router-dom";
import { FilterSidebar } from "@/components/customer/search/FilterSidebar";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { ProductCard, type Product } from "@/components/customer/product/ProductCard";
import { TopSearchSection } from "@/components/customer/home/TopSearchSection";

// Mock Data (reused or expanded)
const CATEGORY_PRODUCTS: Product[] = [
    { id: "c1", name: "Category Item 1", slug: "cat-item-1", price: 299000, image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300", rating: 4.5, soldCount: 100, shopLocation: "Hanoi" },
    { id: "c2", name: "Category Item 2", slug: "cat-item-2", price: 599000, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300", rating: 4.8, soldCount: 200, shopLocation: "HCM", isMall: true },
    { id: "c3", name: "Category Item 3", slug: "cat-item-3", price: 150000, image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300", rating: 4.2, soldCount: 50, shopLocation: "Danang" },
    { id: "c4", name: "Category Item 4", slug: "cat-item-4", price: 890000, image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=300", rating: 4.6, soldCount: 150, shopLocation: "Hanoi" },
    { id: "c5", name: "Category Item 5", slug: "cat-item-5", price: 1200000, image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300", rating: 4.9, soldCount: 300, shopLocation: "HCM" },
];

export default function CategoryPage() {
    const { slug } = useParams(); // This is the category ID from the route /categories/:slug

    return (
        <div className="container mx-auto px-4 py-8">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories", href: "#" }, { label: `Category ${slug}` }]} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
                {/* Filter Sidebar */}
                <div className="hidden lg:block">
                    <FilterSidebar />
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <h1 className="text-2xl font-bold mb-6">Category {slug}</h1>

                    {/* Reusing Top Search as a "Trending in this category" or just generic */}
                    {/* <TopSearchSection /> */}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {CATEGORY_PRODUCTS.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
