import { useParams } from "react-router-dom";
import { ShopHeader } from "@/components/customer/shop/ShopHeader";
import { ProductCard } from "@/components/customer/product/ProductCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

// Mock Data
const MOCK_SHOP = {
    id: "shop1",
    name: "Official Store VN",
    avatar: "https://github.com/shadcn.png",
    cover: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1600&q=80",
    rating: 4.8,
    products: 150,
    followers: 12500,
    joinedDate: "2 years ago",
    responseRate: "98%",
    location: "Hanoi, Vietnam",
    isOnline: true
};

const MOCK_PRODUCTS = Array(12).fill(null).map((_, i) => ({
    id: `p-${i}`,
    name: `Premium Product Item ${i + 1} - High Quality`,
    price: 150000 + i * 10000,
    originalPrice: 200000 + i * 10000,
    rating: 4.5,
    sold: 100 + i * 5,
    image: `https://picsum.photos/seed/${i + 100}/300/300`,
    discount: 15,
    shopLoc: "Hanoi"
}));

export default function ShopPage() {
    const { id } = useParams();
    console.log("Viewing shop:", id); // Use ID to prevent lint error
    // In real app, fetch shop details by id
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            <ShopHeader shop={MOCK_SHOP} />

            <div className="container mx-auto px-4">
                <div className="bg-white rounded-sm shadow-sm">
                    <Tabs defaultValue="home">
                        <div className="flex flex-col md:flex-row justify-between items-center border-b p-2">
                            <TabsList className="bg-transparent h-auto p-0">
                                <TabsTrigger value="home" className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-6 py-3 font-medium">Home</TabsTrigger>
                                <TabsTrigger value="products" className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-6 py-3 font-medium">All Products</TabsTrigger>
                                <TabsTrigger value="categories" className="data-[state=active]:text-shopee-orange data-[state=active]:border-b-2 data-[state=active]:border-shopee-orange rounded-none px-6 py-3 font-medium">Categories</TabsTrigger>
                            </TabsList>

                            <div className="flex gap-2 w-full md:w-auto p-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search in Shop"
                                        className="pl-8 w-full md:w-64 h-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <TabsContent value="home" className="p-4 md:p-6">
                            {/* Banner Slider Mock */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="md:col-span-2 aspect-[2/1] bg-gray-200 rounded-lg overflow-hidden relative">
                                    <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80" alt="banner" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white font-bold text-2xl">Featured Collection</div>
                                </div>
                                <div className="grid grid-rows-2 gap-4">
                                    <div className="bg-gray-200 rounded-lg overflow-hidden">
                                        <img src="https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&q=80" alt="banner2" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="bg-gray-200 rounded-lg overflow-hidden">
                                        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80" alt="banner3" className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold uppercase text-gray-800">Top Products</h2>
                                <Button variant="link" className="text-shopee-orange">See All</Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                                {MOCK_PRODUCTS.slice(0, 6).map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="products" className="p-4 md:p-6">
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                <Button size="sm" variant="outline" className="border-shopee-orange text-shopee-orange bg-orange-50">Popular</Button>
                                <Button size="sm" variant="ghost">Latest</Button>
                                <Button size="sm" variant="ghost">Top Sales</Button>
                                <Button size="sm" variant="ghost">Price</Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                                {MOCK_PRODUCTS.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="categories" className="p-4 md:p-6 text-center text-gray-500 py-20">
                            Categories View (Coming Soon)
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
