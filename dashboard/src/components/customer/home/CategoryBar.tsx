import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shirt, Laptop, Home, Baby, Dog, Dumbbell, Watch, MoreHorizontal, type LucideIcon } from "lucide-react";
import { productService, type Category } from "@/services/product.service";

// Icon mapping cho categories
const iconMap: Record<string, LucideIcon> = {
    'thoi-trang': Shirt,
    'dien-tu': Laptop,
    'nha-cua-doi-song': Home,
    'me-va-be': Baby,
    'thu-cung': Dog,
    'the-thao': Dumbbell,
    'dong-ho': Watch,
    'khac': MoreHorizontal,
};

const colorMap: Record<string, string> = {
    'thoi-trang': 'bg-blue-100 text-blue-600',
    'dien-tu': 'bg-purple-100 text-purple-600',
    'nha-cua-doi-song': 'bg-orange-100 text-orange-600',
    'me-va-be': 'bg-pink-100 text-pink-600',
    'thu-cung': 'bg-amber-100 text-amber-600',
    'the-thao': 'bg-green-100 text-green-600',
    'dong-ho': 'bg-cyan-100 text-cyan-600',
    'khac': 'bg-gray-100 text-gray-600',
};

export function CategoryBar() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await productService.getCategories();
                // Response format: { data: [...] } - API returns data array
                const categoriesArray = Array.isArray(response) ? response : (response?.data || []);
                // Chỉ lấy categories level 1 (main categories)
                const mainCategories = categoriesArray
                    .filter((c: Category) => !c.parent_id)
                    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
                setCategories(mainCategories);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className="py-8">
                <h3 className="text-lg font-bold mb-4">Danh Mục</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="h-16 w-16 rounded-2xl bg-gray-200 animate-pulse" />
                            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }


    return (
        <div className="py-8">
            <h3 className="text-lg font-bold mb-4">Danh Mục</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                {categories.map((cat) => {
                    const Icon = iconMap[cat.slug] || MoreHorizontal;
                    const color = colorMap[cat.slug] || 'bg-gray-100 text-gray-600';
                    
                    return (
                        <Link
                            key={cat.id}
                            to={`/categories/${cat.slug}`}
                            className="flex flex-col items-center gap-2 group cursor-pointer"
                        >
                            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-1 ${color}`}>
                                <Icon className="h-8 w-8" />
                            </div>
                            <span className="text-sm font-medium text-center text-muted-foreground group-hover:text-primary transition-colors">
                                {cat.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
