import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { FilterSidebar } from "@/components/customer/search/FilterSidebar";
import { ProductCard, type Product } from "@/components/customer/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Filter, Loader2 } from "lucide-react";
import { productService } from "@/services/product.service";

export default function ProductSearchPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<any>({});
    const [sortBy, setSortBy] = useState("relevance");
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

    // Fetch products when query, filters, or sort changes
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const response = await productService.searchProducts({
                    q: query,
                    categoryId: filters.categoryId,
                    minPrice: filters.minPrice,
                    maxPrice: filters.maxPrice,
                    minRating: filters.minRating,
                    sortBy: sortBy === 'relevance' ? undefined 
                        : sortBy === 'latest' ? 'created_at'
                        : sortBy === 'sales' ? 'total_sold'
                        : sortBy === 'price_asc' ? 'price'
                        : sortBy === 'price_desc' ? 'price'
                        : undefined,
                    sortOrder: sortBy === 'price_asc' ? 'asc' : 'desc',
                    page: pagination.page,
                    limit: 20,
                });

                const apiProducts = Array.isArray(response) ? response : (response?.data || []);
                const transformed: Product[] = apiProducts.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: p.basePrice || p.base_price,
                    originalPrice: p.compareAtPrice || p.compare_at_price || undefined,
                    image: p.images?.[0]?.url || p.imageUrl || 'https://placehold.co/300x300?text=No+Image',
                    rating: p.avgRating || p.avg_rating || 0,
                    soldCount: p.totalSold || p.total_sold || 0,
                    shopLocation: p.shop?.city || 'Việt Nam',
                }));

                setProducts(transformed);
                
                const paginationData = response?.pagination || {};
                setPagination({
                    page: paginationData.page || 1,
                    totalPages: paginationData.totalPages || 1,
                    total: paginationData.total || transformed.length,
                });
            } catch (error) {
                console.error('Failed to search products:', error);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [query, filters, sortBy, pagination.page]);

    const handleFilterChange = (newFilters: any) => {
        // Merge new filters, removing undefined/null values
        setFilters((prev: any) => {
            const merged = { ...prev, ...newFilters };
            // Clean up null/undefined values
            Object.keys(merged).forEach(key => {
                if (merged[key] === null || merged[key] === undefined) {
                    delete merged[key];
                }
            });
            return merged;
        });
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            <div className="container mx-auto px-4 py-8">
                {/* Header Info */}
                <div className="mb-6 flex items-center gap-2">
                    <span className="text-lg">
                        Kết quả tìm kiếm cho <span className="font-bold text-shopee-orange">"{query}"</span>
                        {!loading && <span className="text-gray-500 text-sm ml-2">({pagination.total} sản phẩm)</span>}
                    </span>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar - Desktop */}
                    <div className="hidden md:block w-64 shrink-0 bg-white p-4 rounded-sm shadow-sm h-fit">
                        <FilterSidebar onFilterChange={handleFilterChange} />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Sort & Filter Mobile */}
                        <div className="bg-gray-100 p-4 rounded-sm mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                                <span className="text-sm text-gray-500 whitespace-nowrap">Sắp xếp</span>
                                <Button
                                    variant={sortBy === 'relevance' ? 'default' : 'outline'}
                                    size="sm"
                                    className={sortBy === 'relevance' ? 'bg-shopee-orange hover:bg-shopee-orange-hover' : 'bg-white'}
                                    onClick={() => setSortBy('relevance')}
                                >
                                    Liên quan
                                </Button>
                                <Button
                                    variant={sortBy === 'latest' ? 'default' : 'outline'}
                                    size="sm"
                                    className={sortBy === 'latest' ? 'bg-shopee-orange hover:bg-shopee-orange-hover' : 'bg-white'}
                                    onClick={() => setSortBy('latest')}
                                >
                                    Mới nhất
                                </Button>
                                <Button
                                    variant={sortBy === 'sales' ? 'default' : 'outline'}
                                    size="sm"
                                    className={sortBy === 'sales' ? 'bg-shopee-orange hover:bg-shopee-orange-hover' : 'bg-white'}
                                    onClick={() => setSortBy('sales')}
                                >
                                    Bán chạy
                                </Button>
                                <Select value={sortBy.startsWith('price') ? sortBy : ''} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-[150px] h-9 bg-white">
                                        <SelectValue placeholder="Giá" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="price_asc">Giá: Thấp đến Cao</SelectItem>
                                        <SelectItem value="price_desc">Giá: Cao đến Thấp</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Mobile Filter Trigger */}
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="sm" className="md:hidden flex items-center gap-2 w-full sm:w-auto">
                                        <Filter className="h-4 w-4" /> Lọc
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[80vw] sm:w-[350px]">
                                    <FilterSidebar onFilterChange={handleFilterChange} />
                                </SheetContent>
                            </Sheet>
                        </div>


                        {/* Loading State */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
                                <p className="text-gray-400 text-sm mt-2">Thử tìm kiếm với từ khóa khác</p>
                            </div>
                        ) : (
                            <>
                                {/* Product Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                                    {products.map(product => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {pagination.totalPages > 1 && (
                                    <div className="mt-8 flex justify-center gap-2">
                                        <Button 
                                            variant="outline" 
                                            disabled={pagination.page <= 1}
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                        >
                                            Trước
                                        </Button>
                                        
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            const pageNum = i + 1;
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                                                    className={pagination.page === pageNum ? 'bg-shopee-orange hover:bg-shopee-orange-hover' : ''}
                                                    onClick={() => handlePageChange(pageNum)}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                        
                                        <Button 
                                            variant="outline"
                                            disabled={pagination.page >= pagination.totalPages}
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                        >
                                            Sau
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
