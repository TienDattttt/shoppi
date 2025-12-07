import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "../common/Rating";
import { ThumbsUp } from "lucide-react";

export function ProductReviews() {
    return (
        <div className="bg-white p-6 rounded-sm shadow-sm min-h-[400px]">
            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Product Specifications</h2>
            <div className="grid grid-cols-[140px_1fr] gap-2 text-sm mb-8 px-4">
                <span className="text-muted-foreground">Category</span>
                <span className="text-blue-500">Shopee / Electronics / Laptop</span>

                <span className="text-muted-foreground">Brand</span>
                <span>Apple</span>

                <span className="text-muted-foreground">Stock</span>
                <span>45</span>

                <span className="text-muted-foreground">Ships From</span>
                <span>Hanoi</span>
            </div>

            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Product Description</h2>
            <div className="text-sm leading-relaxed px-4 whitespace-pre-line mb-8">
                {`MacBook Air 13 inch M1 2020 is an ultra-thin, ultra-light laptop with completely silent fanless design 🤫. 
                
                Key Features:
                - Apple M1 chip with 8-core CPU and 7-core GPU
                - 8GB unified memory
                - 256GB SSD storage
                - Retina display with True Tone
                - Magic Keyboard
                - Touch ID
                - Force Touch trackpad
                - Two Thunderbolt / USB 4 ports`}
            </div>

            <h2 className="text-lg font-medium mb-4 bg-gray-50 p-3">Product Ratings</h2>
            <div className="px-4">
                {/* Summary Header */}
                <div className="flex items-start gap-8 bg-orange-50/50 p-6 border border-orange-100 rounded-sm mb-6">
                    <div className="text-center">
                        <div className="text-4xl text-shopee-orange font-medium">4.8</div>
                        <div className="text-shopee-orange text-lg"><Rating value={5} size={16} /></div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-1">
                        <FilterButton active>All</FilterButton>
                        <FilterButton>5 Star (10k)</FilterButton>
                        <FilterButton>4 Star (500)</FilterButton>
                        <FilterButton>3 Star (100)</FilterButton>
                        <FilterButton>With Comments (5.2k)</FilterButton>
                        <FilterButton>With Media (2.1k)</FilterButton>
                    </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <ReviewItem key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function FilterButton({ active, children }: { active?: boolean, children: React.ReactNode }) {
    return (
        <button
            className={`px-4 py-1 border rounded-sm text-sm ${active
                    ? 'border-shopee-orange text-shopee-orange bg-white'
                    : 'border-gray-200 bg-white hover:border-shopee-orange/50'
                }`}
        >
            {children}
        </button>
    )
}

function ReviewItem() {
    return (
        <div className="flex gap-4 border-b pb-4 last:border-0">
            <Avatar className="h-10 w-10">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${Math.random()}`} />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
                <div className="text-xs text-muted-foreground">User Name</div>
                <Rating value={5} size={12} />
                <div className="text-xs text-muted-foreground mt-1">2023-10-15 14:30 | Variation: Space Grey, 256GB</div>
                <p className="text-sm mt-2">Excellent product, delivered very fast. The packaging was secure and the item arrived in perfect condition. Highly recommended!</p>

                <div className="flex gap-2 mt-2">
                    <div className="h-16 w-16 bg-gray-100 rounded-sm"></div>
                    <div className="h-16 w-16 bg-gray-100 rounded-sm"></div>
                </div>

                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1 cursor-pointer hover:text-shopee-orange w-fit">
                    <ThumbsUp className="h-3 w-3" /> Helpful?
                </div>
            </div>
        </div>
    )
}
