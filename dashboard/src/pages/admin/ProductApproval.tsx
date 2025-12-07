import { useEffect, useState } from "react";
import type { Product } from "@/services/product.service";
import { productService } from "@/services/product.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Eye, Store } from "lucide-react";
import { DataTable } from "@/components/common/DataTable";
import { toast } from "sonner";
import { RejectProductDialog } from "@/components/admin/RejectProductDialog";

export default function ProductApproval() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);

    useEffect(() => {
        loadPendingProducts();
    }, []);

    const loadPendingProducts = async () => {
        setLoading(true);
        try {
            const data = await productService.getPendingProducts();
            setProducts(data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await productService.approveProduct(id);
            toast.success("Product approved successfully");
            loadPendingProducts();
        } catch (error) {
            toast.error("Failed to approve product");
        }
    };

    const handleRejectClick = (product: Product) => {
        setSelectedProduct(product);
        setRejectOpen(true);
    };

    const handleRejectConfirm = async (reason: string) => {
        if (!selectedProduct) return;
        try {
            await productService.rejectProduct(selectedProduct._id, reason);
            toast.success(`Product ${selectedProduct.product_name} rejected`);
            loadPendingProducts();
        } catch (error) {
            toast.error("Failed to reject product");
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const columns = [
        {
            header: "Product",
            cell: (product: Product) => (
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-md border border-border/50 overflow-hidden bg-muted flex-shrink-0">
                        <img
                            src={product.product_thumb}
                            alt={product.product_name}
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col min-w-[200px]">
                        <span className="font-medium text-foreground line-clamp-1" title={product.product_name}>{product.product_name}</span>
                        <span className="text-xs text-muted-foreground">{product.createdAt}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Shop",
            cell: (product: Product) => (
                <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{product.shopName}</span>
                </div>
            )
        },
        {
            header: "Price",
            cell: (product: Product) => <span className="font-medium">{formatCurrency(product.product_price)}</span>
        },
        {
            header: "Category",
            cell: (product: Product) => <Badge variant="secondary">{product.product_type}</Badge>
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (product: Product) => (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-8">
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="default" size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(product._id)}>
                        <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" className="h-8" onClick={() => handleRejectClick(product)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Product Approvals</h1>
                    <p className="text-muted-foreground mt-1">Review and approve new product submissions</p>
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                <DataTable
                    data={products}
                    columns={columns}
                    searchKey="product_name"
                    searchPlaceholder="Filter products..."
                    isLoading={loading}
                />
            </div>

            <RejectProductDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                onConfirm={handleRejectConfirm}
                productName={selectedProduct?.product_name || ""}
            />
        </div>
    );
}
