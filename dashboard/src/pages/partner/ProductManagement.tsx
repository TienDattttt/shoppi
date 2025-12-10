import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "@/services/product.service";
import { productService } from "@/services/product.service";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, PlusCircle, MoreHorizontal, Eye, Download } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/common/DataTable";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProductManagement() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("published");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    useEffect(() => {
        loadProducts();
    }, [activeTab]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const response = activeTab === 'published' 
                ? await productService.getAllPublishedForShop()
                : await productService.getAllDraftsForShop();
            
            // Response format: { data: [...], pagination: {...} }
            const productList = response?.data || [];
            // Map backend fields to frontend expected fields
            const mappedProducts = productList.map((p: Record<string, unknown>) => ({
                ...p,
                _id: p.id || p._id,
                product_name: p.name || p.product_name,
                product_thumb: p.imageUrl || p.image_url || p.product_thumb || '/placeholder.png',
                product_price: p.basePrice || p.base_price || p.product_price,
                product_quantity: p.totalSold || p.total_sold || 0,
                product_type: p.category_name || p.product_type || 'Chưa phân loại',
                isDraft: p.status === 'pending',
                isPublished: p.status === 'active',
            }));
            setProducts(mappedProducts);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const handleView = (product: Product) => {
        const productId = product.id || product._id;
        navigate(`/partner/products/${productId}`);
    };

    const handleEdit = (product: Product) => {
        const productId = product.id || product._id;
        navigate(`/partner/products/edit/${productId}`);
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;
        
        try {
            const productId = productToDelete.id || productToDelete._id;
            await productService.deleteProduct(productId!);
            toast.success("Xóa sản phẩm thành công");
            loadProducts();
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Không thể xóa sản phẩm");
        } finally {
            setDeleteDialogOpen(false);
            setProductToDelete(null);
        }
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
                        <span className="font-medium text-foreground line-clamp-1">{product.product_name || product.name}</span>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] px-1 h-4 font-normal">
                                {product.product_type || 'Chưa phân loại'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">ID: {(product._id || product.id || '').substring(0, 6)}...</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: "Price",
            cell: (product: Product) => <span className="font-medium text-primary">{formatCurrency(product.product_price || product.base_price || 0)}</span>
        },
        {
            header: "Stock",
            cell: (product: Product) => (
                <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${(product.product_quantity || 0) > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{product.product_quantity || 0}</span>
                </div>
            )
        },
        {
            header: "Status",
            cell: (product: Product) => (
                <div>
                    {(product.isDraft || product.status === 'pending') && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Draft</Badge>}
                    {(product.isPublished || product.status === 'active') && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>}
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
                            <DropdownMenuItem onClick={() => handleView(product)}>
                                <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                                <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(product)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                            </DropdownMenuItem>
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
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export Products
                    </Button>
                    <Button className="shadow-lg hover:shadow-xl transition-all" onClick={() => window.location.href = '/partner/products/add'}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Product
                    </Button>
                </div>
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa sản phẩm</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa sản phẩm "{productToDelete?.product_name || productToDelete?.name}"? 
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
