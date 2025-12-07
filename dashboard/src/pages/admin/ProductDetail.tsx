import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productService, type Product } from "@/services/product.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Store, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadProduct(id);
    }, [id]);

    const loadProduct = async (productId: string) => {
        setLoading(true);
        try {
            const data = await productService.getProductById(productId);
            setProduct(data);
        } catch (error) {
            toast.error("Failed to load product");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!id) return;
        try {
            await productService.approveProduct(id);
            toast.success("Product approved");
            loadProduct(id);
        } catch (error) {
            toast.error("Failed to approve");
        }
    };

    const handleReject = async () => {
        if (!id) return;
        try {
            await productService.rejectProduct(id);
            toast.success("Product rejected");
            loadProduct(id);
        } catch (error) {
            toast.error("Failed to reject");
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!product) return <div className="p-8 text-center">Product not found</div>;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {/* Header */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="w-full lg:w-1/3">
                        <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                            <img src={product.product_thumb} alt={product.product_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-square rounded border overflow-hidden bg-muted">
                                    <img src={product.product_thumb} alt="" className="w-full h-full object-cover opacity-70" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={product.isPublished ? "default" : "secondary"}>
                                        {product.isPublished ? "Published" : product.isDraft ? "Draft" : "Pending"}
                                    </Badge>
                                    <Badge variant="outline">{product.product_type}</Badge>
                                </div>
                                <h1 className="text-2xl font-bold">{product.product_name}</h1>
                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <Store className="h-4 w-4" />
                                    <span>{product.shopName || "Unknown Shop"}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!product.isPublished && (
                                    <>
                                        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                                            <Check className="mr-2 h-4 w-4" /> Approve
                                        </Button>
                                        <Button variant="destructive" onClick={handleReject}>
                                            <X className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="text-3xl font-bold text-primary">{formatCurrency(product.product_price)}</div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold">{product.product_quantity}</div>
                                <div className="text-xs text-muted-foreground">In Stock</div>
                            </div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold">{product.product_ratingsAverage || 0}</div>
                                <div className="text-xs text-muted-foreground">Rating</div>
                            </div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold">0</div>
                                <div className="text-xs text-muted-foreground">Sold</div>
                            </div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold">0</div>
                                <div className="text-xs text-muted-foreground">Views</div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <h3 className="font-semibold mb-2">Description</h3>
                            <p className="text-sm text-muted-foreground">{product.product_description || "No description"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="reviews" className="w-full">
                <TabsList>
                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    <TabsTrigger value="history">Approval History</TabsTrigger>
                </TabsList>
                <TabsContent value="reviews" className="pt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Reviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">No reviews yet</div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="history" className="pt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Approval History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Product Created</p>
                                        <p className="text-xs text-muted-foreground">{product.createdAt}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
