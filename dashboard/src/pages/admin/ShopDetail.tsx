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
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-3 text-sm font-medium">Product</th>
                                    <th className="text-left p-3 text-sm font-medium">Price</th>
                                    <th className="text-left p-3 text-sm font-medium">Stock</th>
                                    <th className="text-left p-3 text-sm font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { name: "Áo thun Premium", price: "250,000đ", stock: 45, status: "Active" },
                                    { name: "Quần Jeans Slim", price: "450,000đ", stock: 23, status: "Active" },
                                    { name: "Giày Sneaker", price: "890,000đ", stock: 0, status: "Out of stock" },
                                ].map((product, idx) => (
                                    <tr key={idx} className="border-t hover:bg-muted/30">
                                        <td className="p-3 text-sm font-medium">{product.name}</td>
                                        <td className="p-3 text-sm">{product.price}</td>
                                        <td className="p-3 text-sm">{product.stock}</td>
                                        <td className="p-3">
                                            <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>
                                                {product.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
                <TabsContent value="orders" className="pt-6">
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-3 text-sm font-medium">Order ID</th>
                                    <th className="text-left p-3 text-sm font-medium">Customer</th>
                                    <th className="text-left p-3 text-sm font-medium">Total</th>
                                    <th className="text-left p-3 text-sm font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { id: "#ORD-001", customer: "Nguyen Van A", total: "1,250,000đ", status: "Delivered" },
                                    { id: "#ORD-002", customer: "Tran Thi B", total: "890,000đ", status: "Shipping" },
                                    { id: "#ORD-003", customer: "Le Van C", total: "2,100,000đ", status: "Pending" },
                                ].map((order, idx) => (
                                    <tr key={idx} className="border-t hover:bg-muted/30">
                                        <td className="p-3 text-sm font-mono">{order.id}</td>
                                        <td className="p-3 text-sm">{order.customer}</td>
                                        <td className="p-3 text-sm font-medium">{order.total}</td>
                                        <td className="p-3">
                                            <Badge variant={order.status === 'Delivered' ? 'default' : order.status === 'Shipping' ? 'secondary' : 'outline'}>
                                                {order.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
                <TabsContent value="reviews" className="pt-6">
                    <div className="bg-card rounded-xl border p-6 shadow-sm space-y-4">
                        {[
                            { customer: "Nguyen Van A", rating: 5, comment: "Sản phẩm tuyệt vời, giao hàng nhanh!", date: "2024-01-15" },
                            { customer: "Tran Thi B", rating: 4, comment: "Chất lượng tốt, đóng gói cẩn thận", date: "2024-01-10" },
                            { customer: "Le Van C", rating: 3, comment: "Sản phẩm OK, giao hàng hơi chậm", date: "2024-01-05" },
                        ].map((review, idx) => (
                            <div key={idx} className="p-4 bg-muted/30 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium">{review.customer}</p>
                                        <div className="flex items-center gap-1 text-yellow-500">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-current' : ''}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{review.date}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{review.comment}</p>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
