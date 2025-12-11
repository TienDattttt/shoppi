import { useParams } from "react-router-dom";
import { ShopHeader } from "@/components/customer/shop/ShopHeader";
import { ProductCard } from "@/components/customer/product/ProductCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { shopService } from "@/services/shop.service";
import { productService } from "@/services/product.service";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ShopData {
    id: string;
    shopName: string;
    slug: string;
    description: string | null;
    phone?: string;
    email?: string | null;
    address?: string;
    city: string | null;
    district?: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    rating?: number;
    avgRating?: number;
    followerCount: number;
    productCount: number;
    createdAt: string;
}

interface ProductData {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    compareAtPrice: number | null;
    avgRating: number;
    soldCount: number;
    thumbnailUrl: string | null;
}

interface Filters {
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy: string;
}

const SORT_OPTIONS = [
    { value: "relevance", label: "Phổ biến" },
    { value: "newest", label: "Mới nhất" },
    { value: "best_selling", label: "Bán chạy" },
    { value: "price_asc", label: "Giá: Thấp đến Cao" },
    { value: "price_desc", label: "Giá: Cao đến Thấp" },
    { value: "rating", label: "Đánh giá cao" },
];

export default function ShopPage() {
    const { id } = useParams<{ id: string }>();
    const [shop, setShop] = useState<ShopData | null>(null);
    const [products, setProducts] = useState<ProductData[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState<Filters>({ sortBy: "relevance" });
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (id) {
            fetchShopData();
        }
    }, [id]);

    useEffect(() => {
        if (id && shop) {
            fetchShopProducts();
        }
    }, [filters, currentPage]);

    const fetchShopData = async () => {
        try {
            setLoading(true);
            const response = await shopService.getShopById(id!);
            setShop(response.shop);
            setIsFollowing(response.isFollowing || false);
            
            // Fetch shop products after getting shop data
            fetchShopProducts();
        } catch (error: any) {
            console.error("Error fetching shop:", error);
            toast.error("Không thể tải thông tin shop");
        } finally {
            setLoading(false);
        }
    };

    const fetchShopProducts = async (search?: string) => {
        try {
            setProductsLoading(true);
            const response = await productService.searchProducts({
                shopId: id,
                q: search || searchTerm || undefined,
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice,
                minRating: filters.minRating,
                sortBy: filters.sortBy !== "relevance" ? filters.sortBy : undefined,
                page: currentPage,
                limit: 24,
            });
            
            // Response format: { data: [...], pagination: {...} }
            const productsData = response.data || response.products || [];
            setProducts(productsData.map((p: any) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                basePrice: p.basePrice || p.base_price || 0,
                compareAtPrice: p.compareAtPrice || p.compare_at_price || null,
                avgRating: p.avgRating || p.avg_rating || 0,
                soldCount: p.totalSold || p.total_sold || p.soldCount || 0,
                thumbnailUrl: p.imageUrl || p.images?.[0]?.url || null,
            })));
            
            // Update pagination
            const pagination = response.pagination || {};
            setTotalProducts(pagination.total || productsData.length);
            setTotalPages(pagination.totalPages || 1);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setProductsLoading(false);
        }
    };

    const handleFollowChange = (newFollowState: boolean) => {
        setIsFollowing(newFollowState);
        if (shop) {
            setShop({
                ...shop,
                followerCount: shop.followerCount + (newFollowState ? 1 : -1),
            });
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchShopProducts(searchTerm);
    };

    const handleSortChange = (value: string) => {
        setFilters(prev => ({ ...prev, sortBy: value }));
        setCurrentPage(1);
    };

    const handleApplyPriceFilter = () => {
        setFilters(prev => ({
            ...prev,
            minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
            maxPrice: priceRange[1] < 10000000 ? priceRange[1] : undefined,
        }));
        setCurrentPage(1);
    };

    const handleRatingFilter = (rating: number) => {
        setFilters(prev => ({
            ...prev,
            minRating: prev.minRating === rating ? undefined : rating,
        }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({ sortBy: "relevance" });
        setPriceRange([0, 10000000]);
        setSearchTerm("");
        setCurrentPage(1);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("vi-VN").format(price) + "đ";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-800">Shop không tồn tại</h2>
                    <p className="text-gray-500 mt-2">Shop này không tồn tại hoặc đã bị xóa</p>
                </div>
            </div>
        );
    }

    // Calculate joined time
    const joinedDate = new Date(shop.createdAt);
    const now = new Date();
    const diffYears = now.getFullYear() - joinedDate.getFullYear();
    const joinedText = diffYears > 0 ? `${diffYears} năm trước` : "Mới tham gia";

    const shopHeaderData = {
        id: shop.id,
        name: shop.shopName,
        avatar: shop.logoUrl || "https://placehold.co/100x100?text=Shop",
        cover: shop.bannerUrl || "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1600&q=80",
        rating: shop.avgRating || shop.rating || 0,
        products: shop.productCount || 0,
        followers: shop.followerCount || 0,
        joinedDate: joinedText,
        responseRate: "98%",
        location: shop.city || shop.address || "Việt Nam",
        isOnline: true,
    };

    const hasActiveFilters = filters.minPrice || filters.maxPrice || filters.minRating || searchTerm;

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            <ShopHeader 
                shop={shopHeaderData} 
                isFollowing={isFollowing}
                onFollowChange={handleFollowChange}
            />

            <div className="container mx-auto px-4">
                <div className="bg-white rounded-sm shadow-sm">
                    <Tabs defaultValue="products">
                        <div className="flex flex-col md:flex-row justify-between items-center border-b p-2">
                            <TabsList className="bg-transparent h-auto p-0">
                                <TabsTrigger value="home" className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-6 py-3 font-medium">Trang chủ</TabsTrigger>
                                <TabsTrigger value="products" className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-6 py-3 font-medium">Tất cả sản phẩm</TabsTrigger>
                            </TabsList>

                            <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto p-2">
                                <div className="relative flex-1 md:flex-none">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Tìm trong Shop"
                                        className="pl-8 w-full md:w-64 h-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" size="sm" className="bg-shopee-orange hover:bg-shopee-orange/90 h-9">
                                    Tìm
                                </Button>
                            </form>
                        </div>

                        <TabsContent value="home" className="p-4 md:p-6">
                            {/* Shop Description */}
                            {shop.description && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                    <h3 className="font-medium text-gray-800 mb-2">Giới thiệu Shop</h3>
                                    <p className="text-gray-600 text-sm">{shop.description}</p>
                                </div>
                            )}

                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold uppercase text-gray-800">Sản phẩm nổi bật</h2>
                            </div>

                            {productsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-shopee-orange" />
                                </div>
                            ) : products.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                                    {products.slice(0, 6).map(product => (
                                        <ProductCard key={product.id} product={{
                                            id: product.id,
                                            name: product.name,
                                            slug: product.slug,
                                            price: product.basePrice,
                                            originalPrice: product.compareAtPrice || undefined,
                                            rating: product.avgRating || 0,
                                            soldCount: product.soldCount || 0,
                                            image: product.thumbnailUrl || "https://placehold.co/300x300?text=Product",
                                            shopLocation: shop?.city || "Việt Nam",
                                        }} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Shop chưa có sản phẩm nào
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="products" className="p-4 md:p-6">
                            {/* Filter Bar */}
                            <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
                                <div className="flex flex-wrap gap-2 items-center">
                                    {/* Sort Buttons */}
                                    {SORT_OPTIONS.slice(0, 4).map(option => (
                                        <Button
                                            key={option.value}
                                            size="sm"
                                            variant={filters.sortBy === option.value ? "outline" : "ghost"}
                                            className={filters.sortBy === option.value ? "border-shopee-orange text-shopee-orange bg-orange-50" : ""}
                                            onClick={() => handleSortChange(option.value)}
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                    
                                    {/* Price Sort Dropdown */}
                                    <Select value={filters.sortBy.startsWith("price") ? filters.sortBy : ""} onValueChange={handleSortChange}>
                                        <SelectTrigger className="w-[120px] h-8">
                                            <SelectValue placeholder="Giá" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="price_asc">Thấp đến Cao</SelectItem>
                                            <SelectItem value="price_desc">Cao đến Thấp</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Filter Sheet (Mobile) */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button size="sm" variant="outline" className="md:hidden">
                                                <SlidersHorizontal className="h-4 w-4 mr-1" />
                                                Lọc
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="right" className="w-80">
                                            <SheetHeader>
                                                <SheetTitle>Bộ lọc</SheetTitle>
                                            </SheetHeader>
                                            <div className="mt-6 space-y-6">
                                                {/* Price Range */}
                                                <div>
                                                    <Label className="text-sm font-medium">Khoảng giá</Label>
                                                    <div className="mt-2">
                                                        <Slider
                                                            value={priceRange}
                                                            onValueChange={(value: number[]) => setPriceRange(value as [number, number])}
                                                            max={10000000}
                                                            step={100000}
                                                            className="mt-2"
                                                        />
                                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                            <span>{formatPrice(priceRange[0])}</span>
                                                            <span>{formatPrice(priceRange[1])}</span>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" className="mt-2 w-full" onClick={handleApplyPriceFilter}>
                                                        Áp dụng
                                                    </Button>
                                                </div>

                                                {/* Rating Filter */}
                                                <div>
                                                    <Label className="text-sm font-medium">Đánh giá</Label>
                                                    <div className="mt-2 space-y-2">
                                                        {[5, 4, 3, 2, 1].map(rating => (
                                                            <Button
                                                                key={rating}
                                                                size="sm"
                                                                variant={filters.minRating === rating ? "default" : "outline"}
                                                                className="w-full justify-start"
                                                                onClick={() => handleRatingFilter(rating)}
                                                            >
                                                                {rating} sao trở lên
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {hasActiveFilters && (
                                                    <Button variant="ghost" className="w-full" onClick={handleClearFilters}>
                                                        Xóa bộ lọc
                                                    </Button>
                                                )}
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>

                                {/* Desktop Filters */}
                                <div className="hidden md:flex items-center gap-2">
                                    {/* Price Range Filter */}
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Giá từ"
                                            className="w-24 h-8 text-sm"
                                            value={priceRange[0] || ""}
                                            onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                                        />
                                        <span className="text-gray-400">-</span>
                                        <Input
                                            type="number"
                                            placeholder="Giá đến"
                                            className="w-24 h-8 text-sm"
                                            value={priceRange[1] === 10000000 ? "" : priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 10000000])}
                                        />
                                        <Button size="sm" variant="outline" className="h-8" onClick={handleApplyPriceFilter}>
                                            Áp dụng
                                        </Button>
                                    </div>

                                    {/* Rating Filter */}
                                    <Select 
                                        value={filters.minRating?.toString() || ""} 
                                        onValueChange={(v) => handleRatingFilter(Number(v))}
                                    >
                                        <SelectTrigger className="w-[140px] h-8">
                                            <SelectValue placeholder="Đánh giá" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5 sao</SelectItem>
                                            <SelectItem value="4">4 sao trở lên</SelectItem>
                                            <SelectItem value="3">3 sao trở lên</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {hasActiveFilters && (
                                        <Button size="sm" variant="ghost" onClick={handleClearFilters}>
                                            Xóa lọc
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Results Info */}
                            <div className="text-sm text-gray-500 mb-4">
                                {searchTerm && <span>Kết quả tìm kiếm cho "{searchTerm}" - </span>}
                                <span>{totalProducts} sản phẩm</span>
                            </div>

                            {/* Products Grid */}
                            {productsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-shopee-orange" />
                                </div>
                            ) : products.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                                        {products.map(product => (
                                            <ProductCard key={product.id} product={{
                                                id: product.id,
                                                name: product.name,
                                                slug: product.slug,
                                                price: product.basePrice,
                                                originalPrice: product.compareAtPrice || undefined,
                                                rating: product.avgRating || 0,
                                                soldCount: product.soldCount || 0,
                                                image: product.thumbnailUrl || "https://placehold.co/300x300?text=Product",
                                                shopLocation: shop?.city || "Việt Nam",
                                            }} />
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center gap-2 mt-6">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(p => p - 1)}
                                            >
                                                Trước
                                            </Button>
                                            <span className="flex items-center px-3 text-sm">
                                                Trang {currentPage} / {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(p => p + 1)}
                                            >
                                                Sau
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    {searchTerm || hasActiveFilters 
                                        ? "Không tìm thấy sản phẩm phù hợp" 
                                        : "Shop chưa có sản phẩm nào"}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
