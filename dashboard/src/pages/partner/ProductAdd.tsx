
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { productService } from "@/services/product.service";
import { toast } from "sonner";

import { ImageUpload } from "@/components/common/ImageUpload";

export default function ProductAdd() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Simple state management for form
    const [formData, setFormData] = useState({
        product_name: "",
        product_price: "",
        product_quantity: "",
        product_description: "",
        product_type: "Physical",
        product_images: [] as string | string[] // Add images state
    });

    useEffect(() => {
        if (isEditMode && id) {
            loadProduct(id);
        }
    }, [id, isEditMode]);

    const loadProduct = async (productId: string) => {
        setFetching(true);
        try {
            const data = await productService.getProductById(productId);
            setFormData({
                product_name: data.product_name,
                product_price: String(data.product_price),
                product_quantity: String(data.product_quantity),
                product_description: data.product_description || "",
                product_type: data.product_type || "Physical",
                product_images: data.product_images || []
            });
        } catch (error) {
            toast.error("Failed to load product details");
            navigate("/partner/products");
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                product_price: Number(formData.product_price),
                product_quantity: Number(formData.product_quantity),
                product_attributes: {} // TODO: Dynamic attributes based on type
            };

            if (isEditMode && id) {
                await productService.updateProduct(id, payload);
                toast.success("Product updated successfully");
            } else {
                await productService.createProduct(payload);
                toast.success("Product created successfully");
            }
            navigate("/partner/products");
        } catch (error) {
            console.error("Failed to save", error);
            toast.error("Failed to save product");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center">Loading product details...</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20 relative">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 sticky top-[64px] z-10 bg-background/95 backdrop-blur py-4 -mx-6 px-6 border-b border-border/40">
                <Button variant="ghost" size="icon" onClick={() => navigate("/partner/products")} className="rounded-full hover:bg-muted">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{isEditMode ? "Edit Product" : "Add New Product"}</h1>
                    <p className="text-sm text-muted-foreground">{isEditMode ? "Update product details" : "Create a new product for your shop"}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Basic Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                                <CardDescription>Product name, description and images</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-base">Product Images *</Label>
                                    <ImageUpload
                                        value={formData.product_images} // Need to add to state
                                        onChange={(val) => setFormData(prev => ({ ...prev, product_images: val }))}
                                        maxFiles={5}
                                    />
                                    <p className="text-xs text-muted-foreground">Upload at least 1 image. JPG, PNG max 5MB.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="product_name">Product Name *</Label>
                                    <Input
                                        id="product_name"
                                        name="product_name"
                                        placeholder="Enter product name..."
                                        className="h-11"
                                        value={formData.product_name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="product_description">Description *</Label>
                                    <Textarea
                                        id="product_description"
                                        name="product_description"
                                        placeholder="Detailed description..."
                                        className="min-h-[200px] resize-none"
                                        value={formData.product_description}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle>Sales Information</CardTitle>
                                <CardDescription>Pricing and inventory</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="product_price">Price (VND) *</Label>
                                    <div className="relative">
                                        <Input
                                            id="product_price"
                                            name="product_price"
                                            type="number"
                                            placeholder="0"
                                            className="h-11 pl-4"
                                            value={formData.product_price}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="product_quantity">Stock *</Label>
                                    <Input
                                        id="product_quantity"
                                        name="product_quantity"
                                        type="number"
                                        placeholder="0"
                                        className="h-11"
                                        value={formData.product_quantity}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Organization / Actions (Optional for future) */}
                    <div className="space-y-6">
                        <Card className="shadow-premium border-border/50">
                            <CardHeader>
                                <CardTitle>Organization</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Product Type</Label>
                                    <Input value="Physical Product" disabled className="bg-muted" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-4 fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur border-t border-border/40 p-4 shadow-lg z-50">
                    <div className="max-w-4xl w-full mx-auto flex justify-end gap-4 px-6 md:px-0">
                        <Button type="button" variant="outline" onClick={() => navigate("/partner/products")} className="shadow-sm">
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-primary hover:bg-primary/90 shadow-md min-w-[150px]" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isEditMode ? "Update Product" : "Save & Publish"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
