import { Link } from "react-router-dom";
import { Shirt, Laptop, Home, Baby, Dog, Dumbbell, Watch, MoreHorizontal } from "lucide-react";

const categories = [
    { id: 1, name: "Fashion", icon: Shirt, color: "bg-blue-100 text-blue-600" },
    { id: 2, name: "Electronics", icon: Laptop, color: "bg-purple-100 text-purple-600" },
    { id: 3, name: "Home & Living", icon: Home, color: "bg-orange-100 text-orange-600" },
    { id: 4, name: "Mother & Baby", icon: Baby, color: "bg-pink-100 text-pink-600" },
    { id: 5, name: "Pets", icon: Dog, color: "bg-amber-100 text-amber-600" },
    { id: 6, name: "Sports", icon: Dumbbell, color: "bg-green-100 text-green-600" },
    { id: 7, name: "Watches", icon: Watch, color: "bg-cyan-100 text-cyan-600" },
    { id: 8, name: "Others", icon: MoreHorizontal, color: "bg-gray-100 text-gray-600" },
];

export function CategoryBar() {
    return (
        <div className="py-8">
            <h3 className="text-lg font-bold mb-4">Categories</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                {categories.map((cat) => (
                    <Link
                        key={cat.id}
                        to={`/categories/${cat.id}`}
                        className="flex flex-col items-center gap-2 group cursor-pointer"
                    >
                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-1 ${cat.color}`}>
                            <cat.icon className="h-8 w-8" />
                        </div>
                        <span className="text-sm font-medium text-center text-muted-foreground group-hover:text-primary transition-colors">
                            {cat.name}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
