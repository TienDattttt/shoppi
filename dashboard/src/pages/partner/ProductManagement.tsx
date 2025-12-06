import { useEffect, useState } from "react";
import type { Product } from "@/services/product.service";
import { productService } from "@/services/product.service";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, PlusCircle, MoreHorizontal, Eye } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/common/DataTable";

export default function ProductManagement() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("published");

    useEffect(() => {
        loadProducts();
    }, [activeTab]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            let data;
            if (activeTab === 'published') {
                data = await productService.getAllPublishedForShop();
            } else {
                data = await productService.getAllDraftsForShop();
            }
            setProducts(data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const columns = [
        {
            header: "Product Info",
            cell: (product: Product) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md border border-border/50 overflow-hidden bg-muted">
                        <img
                            src={product.product_thumb}
                            alt={product.product_name}
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground line-clamp-1">{product.product_name}</span>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] px-1 h-4 font-normal">
                                {product.product_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">ID: {product._id.substring(0, 6)}...</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: "Price",
            cell: (product: Product) => <span className="font-medium text-primary">{formatCurrency(product.product_price)}</span>
        },
        {
            header: "Stock",
            cell: (product: Product) => (
                <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${product.product_quantity > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{product.product_quantity}</span>
                </div>
            )
        },
        {
            header: "Status",
            cell: (product: Product) => (
                <div>
                    {product.isDraft && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Draft</Badge>}
                    {product.isPublished && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>}
                </div>
            )
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (product: Product) => (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Product Management</h1>
                    <p className="text-muted-foreground mt-1">Manage your shop inventory</p>
                </div>
                <Button className="shadow-lg hover:shadow-xl transition-all" onClick={() => window.location.href = '/partner/products/add'}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Product
                </Button>
            </div>

            <Tabs defaultValue="published" onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="published">Active Products</TabsTrigger>
                    <TabsTrigger value="draft">Drafts</TabsTrigger>
                </TabsList>

                <TabsContent value="published" className="outline-none">
                    <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                        <DataTable
                            data={products}
                            columns={columns}
                            searchKey="product_name"
                            searchPlaceholder="Search products..."
                            isLoading={loading}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="draft" className="outline-none">
                    <div className="bg-card rounded-xl shadow-premium border border-border/50 overflow-hidden p-6">
                        <DataTable
                            data={products}
                            columns={columns}
                            searchKey="product_name"
                            searchPlaceholder="Search drafts..."
                            isLoading={loading}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
