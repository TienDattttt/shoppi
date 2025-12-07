import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Star, Filter } from "lucide-react";

interface FilterSidebarProps {
    onFilterChange: (filters: any) => void;
}

const CATEGORIES = [
    { id: 'cat1', label: 'Electronics' },
    { id: 'cat2', label: 'Fashion' },
    { id: 'cat3', label: 'Home & Living' },
    { id: 'cat4', label: 'Beauty' },
    { id: 'cat5', label: 'Books' },
];

export function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const handleApplyPrice = () => {
        onFilterChange({ type: 'price', value: priceRange });
    };

    const handleCategoryChange = (catId: string, checked: boolean) => {
        let newCats = checked
            ? [...selectedCategories, catId]
            : selectedCategories.filter(id => id !== catId);

        setSelectedCategories(newCats);
        onFilterChange({ type: 'category', value: newCats });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 font-bold mb-4">
                <Filter className="h-4 w-4" /> SEARCH FILTER
            </div>

            {/* Categories */}
            <div>
                <h3 className="font-medium mb-2 text-sm">Category</h3>
                <div className="space-y-2">
                    {CATEGORIES.map(cat => (
                        <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={cat.id}
                                onCheckedChange={(checked) => handleCategoryChange(cat.id, checked as boolean)}
                            />
                            <label htmlFor={cat.id} className="text-sm cursor-pointer">{cat.label}</label>
                        </div>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Price Range */}
            <div>
                <h3 className="font-medium mb-2 text-sm">Price Range</h3>
                <div className="flex items-center gap-2 mb-2">
                    <Input
                        placeholder="₫ MIN"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="h-8 text-xs"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                        placeholder="₫ MAX"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="h-8 text-xs"
                    />
                </div>
                <Button
                    className="w-full bg-shopee-orange hover:bg-shopee-orange-hover h-8 text-xs"
                    onClick={handleApplyPrice}
                >
                    APPLY
                </Button>
            </div>

            <Separator />

            {/* Rating */}
            <div>
                <h3 className="font-medium mb-2 text-sm">Rating</h3>
                <div className="space-y-2 cursor-pointer">
                    {[5, 4, 3, 2, 1].map(rating => (
                        <div key={rating} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded" onClick={() => onFilterChange({ type: 'rating', value: rating })}>
                            <div className="flex text-yellow-400">
                                {Array(5).fill(null).map((_, i) => (
                                    <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-current' : 'text-gray-200 fill-gray-200'}`} />
                                ))}
                            </div>
                            {rating < 5 && <span className="text-xs text-gray-500">& Up</span>}
                        </div>
                    ))}
                </div>
            </div>

            <Separator />
            <Button variant="outline" className="w-full" onClick={() => onFilterChange({ type: 'clear' })}>
                Clear All
            </Button>
        </div>
    );
}
