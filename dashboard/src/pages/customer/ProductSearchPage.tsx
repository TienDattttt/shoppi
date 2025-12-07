import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { FilterSidebar } from "@/components/customer/search/FilterSidebar";
import { ProductCard } from "@/components/customer/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";

// Mock implementation of Mock Data
const MOCK_PRODUCTS = Array(20).fill(null).map((_, i) => ({
    id: `search-p-${i}`,
    name: `Search Result Product ${i + 1}`,
    price: 150000 + (Math.random() * 500000),
    originalPrice: 200000 + (Math.random() * 500000),
    rating: 4.0 + (Math.random() * 1.0),
    sold: Math.floor(Math.random() * 1000),
    image: `https://picsum.photos/seed/${i + 500}/300/300`,
    discount: Math.floor(Math.random() * 50),
    shopLoc: "Hanoi"
}));

export default function ProductSearchPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const [filters, setFilters] = useState<any>({});
    const [sortBy, setSortBy] = useState("relevance");

    const handleFilterChange = (newFilter: any) => {
        setFilters((prev: any) => {
            const next = { ...prev, ...newFilter };
            console.log("Filter applied:", next);
            return next;
        });
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            <div className="container mx-auto px-4 py-8">
                {/* Header Info */}
                <div className="mb-6 flex items-center gap-2">
                    <span className="text-lg">Result for <span className="font-bold text-shopee-orange">"{query}"</span></span>
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
                                <span className="text-sm text-gray-500 whitespace-nowrap">Sort by</span>
                                <Button
                                    variant={sortBy === 'relevance' ? 'default' : 'outline'}
                                    size="sm"
                                    className={sortBy === 'relevance' ? 'bg-shopee-orange hover:bg-shopee-orange-hover' : 'bg-white'}
                                    onClick={() => setSortBy('relevance')}
                                >
                                    Relevance
                                </Button>
                                <Button
                                    variant={sortBy === 'latest' ? 'default' : 'outline'}
                                    size="sm"
                                    className={sortBy === 'latest' ? 'bg-shopee-orange hover:bg-shopee-orange-hover' : 'bg-white'}
                                    onClick={() => setSortBy('latest')}
                                >
                                    Latest
                                </Button>
                                <Button
                                    variant={sortBy === 'sales' ? 'default' : 'outline'}
                                    size="sm"
                                    className={sortBy === 'sales' ? 'bg-shopee-orange hover:bg-shopee-orange-hover' : 'bg-white'}
                                    onClick={() => setSortBy('sales')}
                                >
                                    Top Sales
                                </Button>
                                <Select onValueChange={setSortBy}>
                                    <SelectTrigger className="w-[150px] h-9 bg-white">
                                        <SelectValue placeholder="Price" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Mobile Filter Trigger */}
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="sm" className="md:hidden flex items-center gap-2 w-full sm:w-auto">
                                        <Filter className="h-4 w-4" /> Filter
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[80vw] sm:w-[350px]">
                                    <FilterSidebar onFilterChange={handleFilterChange} />
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Product Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                            {MOCK_PRODUCTS.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Pagination (Mock) */}
                        <div className="mt-8 flex justify-center gap-2">
                            <Button variant="outline" disabled>Previous</Button>
                            <Button variant="default" className="bg-shopee-orange hover:bg-shopee-orange-hover">1</Button>
                            <Button variant="outline">2</Button>
                            <Button variant="outline">3</Button>
                            <Button variant="outline">Next</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
