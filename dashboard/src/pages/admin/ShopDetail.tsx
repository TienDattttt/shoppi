import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { shopService } from "@/services/shop.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Store, MapPin, Package, Star, DollarSign, ShieldAlert, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/common/StatCard";

export default function ShopDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shop, setShop] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadShop(id);
    }, [id]);

    const loadShop = async (shopId: string) => {
        setLoading(true);
        try {
            const data = await shopService.getShopById(shopId);
            setShop(data);
        } catch (error) {
            toast.error("Failed to load shop");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!shop) return <div>Shop not found</div>;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate("/admin/shops")} className="gap-2 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="h-4 w-4" /> Back to Shops
            </Button>

            {/* Header / Info */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="h-24 w-24 rounded-lg bg-muted border flex items-center justify-center flex-shrink-0">
                        <Store className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold">{shop.name}</h1>
                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{shop.address}</span>
                                </div>
                                <p className="mt-2 text-sm max-w-2xl">{shop.description}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                                    <ShieldAlert className="mr-2 h-4 w-4" /> Suspend
                                </Button>
                                <Button variant="default" className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="mr-2 h-4 w-4" /> Verify
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(shop.revenue)}
                    icon={DollarSign}
                    trend={{ value: 12, label: "from last month", isPositive: true }}
                />
                <StatCard title="Total Products" value={shop.products} icon={Package} />
                <StatCard title="Rating" value={shop.rating} icon={Star} description="Average rating" />
                <StatCard title="Status" value={shop.status} icon={CheckCircle} className="capitalize" />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="products" className="w-full">
                <TabsList>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                <TabsContent value="products" className="pt-6">
                    <div className="bg-card rounded-xl border p-6 shadow-sm min-h-[300px] flex items-center justify-center text-muted-foreground">
                        Products list will be here (Component reusable)
                    </div>
                </TabsContent>
                <TabsContent value="orders" className="pt-6">
                    <div className="bg-card rounded-xl border p-6 shadow-sm min-h-[300px] flex items-center justify-center text-muted-foreground">
                        Shop orders will be here
                    </div>
                </TabsContent>
                <TabsContent value="reviews" className="pt-6">
                    <div className="bg-card rounded-xl border p-6 shadow-sm min-h-[300px] flex items-center justify-center text-muted-foreground">
                        Reviews will be here
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
