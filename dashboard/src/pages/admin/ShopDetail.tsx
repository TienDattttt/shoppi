import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Store, MapPin, Package, Star, ShieldAlert, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/common/StatCard";

interface Product {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    status: string;
}

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    total: number;
    status: string;
}

interface Review {
    id: string;
    rating: number;
    comment: string;
    customer_name: string;
    created_at: string;
}

export default function ShopDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shop, setShop] = useState<any>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(false);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    useEffect(() => {
        if (id) {
            loadShop(id);
            loadProducts(id);
            loadOrders(id);
            loadReviews(id);
        }
    }, [id]);

    const loadShop = async (shopId: string) => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/shops/${shopId}`);
            setShop(res.data.shop || res.data);
        } catch (error) {
            toast.error("Failed to load shop");
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async (shopId: string) => {
        setProductsLoading(true);
        try {
            const res = await api.get(`/admin/shops/${shopId}/products`);
            setProducts(res.data.products || []);
        } catch (e) {
            console.error(e);
        } finally {
            setProductsLoading(false);
        }
    };

    const loadOrders = async (shopId: string) => {
        setOrdersLoading(true);
        try {
            const res = await api.get(`/admin/shops/${shopId}/orders`);
            setOrders(res.data.orders || []);
        } catch (e) {
            console.error(e);
        } finally {
            setOrdersLoading(false);
        }
    };

    const loadReviews = async (shopId: string) => {
        setReviewsLoading(true);
        try {
            const res = await api.get(`/admin/shops/${shopId}/reviews`);
            setReviews(res.data.reviews || []);
        } catch (e) {
            console.error(e);
        } finally {
            setReviewsLoading(false);
        }
    };

    const formatCurrency = (v: number) => {
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    if (!shop) return <div>Shop not found</div>;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate("/admin/shops")} className="gap-2 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="h-4 w-4" /> Back to Shops
            </Button>

            <div className="bg-card rounded-xl border p-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {shop.logo_url ? (
                        <img src={shop.logo_url} alt={shop.shop_name} className="h-24 w-24 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                        <div className="h-24 w-24 rounded-lg bg-muted border flex items-center justify-center flex-shrink-0">
                            <Store className="h-10 w-10 text-muted-foreground" />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold">{shop.shop_name}</h1>
                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{shop.address || "No address"}, {shop.city || ""}</span>
                                </div>
                                <p className="mt-2 text-sm max-w-2xl">{shop.description || "No description"}</p>
                                <div className="mt-2 text-sm text-muted-foreground">
                                    📧 {shop.email || "-"} | 📞 {shop.phone || "-"}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {shop.status === "active" && (
                                    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                                        <ShieldAlert className="mr-2 h-4 w-4" /> Suspend
                                    </Button>
                                )}
                                {shop.status === "pending" && (
                                    <Button variant="default" className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <StatCard title="Total Products" value={shop.product_count || 0} icon={Package} />
                <StatCard title="Followers" value={shop.follower_count || 0} icon={Store} />
                <StatCard title="Rating" value={shop.avg_rating || 0} icon={Star} description="Average rating" />
                <StatCard title="Status" value={shop.status} icon={CheckCircle} className="capitalize" />
            </div>

            <Tabs defaultValue="products" className="w-full">
                <TabsList>
                    <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
                    <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="products" className="pt-6">
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        {productsLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : products.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No products found</p>
                        ) : (
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
                                    {products.map((product) => (
                                        <tr key={product.id} className="border-t hover:bg-muted/30">
                                            <td className="p-3 text-sm font-medium">{product.name}</td>
                                            <td className="p-3 text-sm">{formatCurrency(product.price)}</td>
                                            <td className="p-3 text-sm">{product.stock_quantity}</td>
                                            <td className="p-3">
                                                <Badge variant={product.status === "active" ? "default" : "secondary"}>
                                                    {product.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="orders" className="pt-6">
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        {ordersLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : orders.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No orders found</p>
                        ) : (
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
                                    {orders.map((order) => (
                                        <tr key={order.id} className="border-t hover:bg-muted/30">
                                            <td className="p-3 text-sm font-mono">#{order.order_number}</td>
                                            <td className="p-3 text-sm">{order.customer_name}</td>
                                            <td className="p-3 text-sm font-medium">{formatCurrency(order.total)}</td>
                                            <td className="p-3">
                                                <Badge variant={order.status === "delivered" ? "default" : order.status === "shipping" ? "secondary" : "outline"}>
                                                    {order.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="reviews" className="pt-6">
                    <div className="bg-card rounded-xl border p-6 shadow-sm space-y-4">
                        {reviewsLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : reviews.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No reviews found</p>
                        ) : (
                            reviews.map((review) => (
                                <div key={review.id} className="p-4 bg-muted/30 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium">{review.customer_name}</p>
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-current" : ""}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{review.comment || "No comment"}</p>
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
