import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Star, Filter, Loader2 } from "lucide-react";
import { productService } from "@/services/product.service";

interface Category {
    id: string;
    name: string;
    slug: string;
    children?: Category[];
}

interface FilterSidebarProps {
    onFilterChange: (filters: any) => void;
}

export function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);

    // Fetch categories from API
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await productService.getCategories();
                const categoryList = Array.isArray(data) ? data : (data?.data || []);
                setCategories(categoryList);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    const handleApplyPrice = () => {
        onFilterChange({ 
            minPrice: priceRange.min ? parseInt(priceRange.min) : undefined,
            maxPrice: priceRange.max ? parseInt(priceRange.max) : undefined,
        });
    };

    const handleCategoryChange = (categoryId: string, checked: boolean) => {
        const newCategory = checked ? categoryId : null;
        setSelectedCategory(newCategory);
        onFilterChange({ categoryId: newCategory });
    };

    const handleRatingChange = (rating: number) => {
        const newRating = selectedRating === rating ? null : rating;
        setSelectedRating(newRating);
        onFilterChange({ minRating: newRating });
    };

    const handleClearAll = () => {
        setPriceRange({ min: '', max: '' });
        setSelectedCategory(null);
        setSelectedRating(null);
        onFilterChange({ 
            categoryId: null, 
            minPrice: undefined, 
            maxPrice: undefined,
            minRating: null,
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 font-bold mb-4">
                <Filter className="h-4 w-4" /> BỘ LỌC TÌM KIẾM
            </div>

            {/* Categories */}
            <div>
                <h3 className="font-medium mb-2 text-sm">Danh Mục</h3>
                {loadingCategories ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                    </div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {categories.map(cat => (
                            <div key={cat.id}>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={cat.id}
                                        checked={selectedCategory === cat.id}
                                        onCheckedChange={(checked) => handleCategoryChange(cat.id, checked as boolean)}
                                    />
                                    <label htmlFor={cat.id} className="text-sm cursor-pointer">
                                        {cat.name}
                                    </label>
                                </div>
                                {/* Sub-categories */}
                                {cat.children && cat.children.length > 0 && (
                                    <div className="ml-4 mt-1 space-y-1">
                                        {cat.children.map(subCat => (
                                            <div key={subCat.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={subCat.id}
                                                    checked={selectedCategory === subCat.id}
                                                    onCheckedChange={(checked) => handleCategoryChange(subCat.id, checked as boolean)}
                                                />
                                                <label htmlFor={subCat.id} className="text-xs cursor-pointer text-muted-foreground">
                                                    {subCat.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Separator />

            {/* Price Range */}
            <div>
                <h3 className="font-medium mb-2 text-sm">Khoảng Giá</h3>
                <div className="flex items-center gap-2 mb-2">
                    <Input
                        placeholder="₫ TỪ"
                        type="number"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="h-8 text-xs"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                        placeholder="₫ ĐẾN"
                        type="number"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="h-8 text-xs"
                    />
                </div>
                <Button
                    className="w-full bg-shopee-orange hover:bg-shopee-orange-hover h-8 text-xs"
                    onClick={handleApplyPrice}
                >
                    ÁP DỤNG
                </Button>
            </div>

            <Separator />

            {/* Rating */}
            <div>
                <h3 className="font-medium mb-2 text-sm">Đánh Giá</h3>
                <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(rating => (
                        <div 
                            key={rating} 
                            className={`flex items-center gap-2 p-1 rounded cursor-pointer transition-colors ${
                                selectedRating === rating 
                                    ? 'bg-orange-50 border border-shopee-orange' 
                                    : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleRatingChange(rating)}
                        >
                            <div className="flex text-yellow-400">
                                {Array(5).fill(null).map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`h-4 w-4 ${
                                            i < rating ? 'fill-current' : 'text-gray-200 fill-gray-200'
                                        }`} 
                                    />
                                ))}
                            </div>
                            {rating < 5 && <span className="text-xs text-gray-500">trở lên</span>}
                        </div>
                    ))}
                </div>
            </div>

            <Separator />
            
            <Button variant="outline" className="w-full" onClick={handleClearAll}>
                Xóa Tất Cả
            </Button>
        </div>
    );
}
