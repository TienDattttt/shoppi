import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Package, 
    AlertTriangle, 
    XCircle, 
    CheckCircle,
    Search,
    RefreshCw,
    Edit2,
    Save,
    X
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from "@/services/api";
import { toast } from "sonner";

interface InventoryItem {
    id: string;
    product_id: string;
    sku: string;
    name: string | null;
    quantity: number;
    reserved_quantity: number;
    low_stock_threshold: number;
    availableQuantity: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
    is_active: boolean;
    product: {
        id: string;
        name: string;
        status: string;
    };
}

interface InventorySummary {
    totalVariants: number;
    lowStockCount: number;
    outOfStockCount: number;
    inStockCount: number;
}

export default function InventoryManagement() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<InventorySummary>({
        totalVariants: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        inStockCount: 0,
    });
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ quantity: number; threshold: number }>({ quantity: 0, threshold: 10 });

    useEffect(() => {
        loadInventory();
    }, [filter]);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { limit: '100' };
            if (filter === 'low') params.lowStockOnly = 'true';
            if (filter === 'out') params.outOfStockOnly = 'true';
            if (search) params.search = search;

            const response = await api.get('/products/inventory', { params });
            setInventory(response.data?.data || []);
            setSummary(response.data?.summary || {
                totalVariants: 0,
                lowStockCount: 0,
                outOfStockCount: 0,
                inStockCount: 0,
            });
        } catch (error) {
            console.error('Error loading inventory:', error);
            toast.error('Không thể tải dữ liệu tồn kho');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        loadInventory();
    };

    const startEdit = (item: InventoryItem) => {
        setEditingId(item.id);
        setEditValues({
            quantity: item.quantity,
            threshold: item.low_stock_threshold,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({ quantity: 0, threshold: 10 });
    };

    const saveEdit = async (variantId: string) => {
        try {
            await api.patch(`/products/inventory/${variantId}`, {
                quantity: editValues.quantity,
                lowStockThreshold: editValues.threshold,
            });
            toast.success('Cập nhật tồn kho thành công');
            setEditingId(null);
            loadInventory();
        } catch (error) {
            console.error('Error updating stock:', error);
            toast.error('Không thể cập nhật tồn kho');
        }
    };

    const getStockBadge = (item: InventoryItem) => {
        if (item.isOutOfStock) {
            return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Hết hàng</Badge>;
        }
        if (item.isLowStock) {
            return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1"><AlertTriangle className="h-3 w-3" /> Sắp hết</Badge>;
        }
        return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 gap-1"><CheckCircle className="h-3 w-3" /> Còn hàng</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Quản lý tồn kho</h1>
                <p className="text-muted-foreground mt-1">
                    Theo dõi và cập nhật số lượng sản phẩm trong kho
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng SKU</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalVariants}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Còn hàng</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{summary.inStockCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sắp hết hàng</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{summary.lowStockCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hết hàng</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{summary.outOfStockCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 flex gap-2">
                            <Input
                                placeholder="Tìm theo SKU hoặc tên..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="max-w-sm"
                            />
                            <Button variant="outline" onClick={handleSearch}>
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Lọc theo trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    <SelectItem value="low">Sắp hết hàng</SelectItem>
                                    <SelectItem value="out">Hết hàng</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={loadInventory}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* Inventory Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Danh sách tồn kho</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                    ) : inventory.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Chưa có sản phẩm</h3>
                            <p className="text-muted-foreground">
                                Thêm sản phẩm và biến thể để quản lý tồn kho
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sản phẩm</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Biến thể</TableHead>
                                    <TableHead className="text-center">Tồn kho</TableHead>
                                    <TableHead className="text-center">Đã đặt</TableHead>
                                    <TableHead className="text-center">Có sẵn</TableHead>
                                    <TableHead className="text-center">Ngưỡng</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inventory.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium max-w-[200px] truncate">
                                            {item.product?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {item.sku}
                                        </TableCell>
                                        <TableCell>
                                            {item.name || '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {editingId === item.id ? (
                                                <Input
                                                    type="number"
                                                    value={editValues.quantity}
                                                    onChange={(e) => setEditValues(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                                    className="w-20 h-8 text-center"
                                                    min={0}
                                                />
                                            ) : (
                                                <span className={item.isOutOfStock ? 'text-red-600 font-semibold' : ''}>
                                                    {item.quantity}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground">
                                            {item.reserved_quantity}
                                        </TableCell>
                                        <TableCell className="text-center font-semibold">
                                            {item.availableQuantity}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {editingId === item.id ? (
                                                <Input
                                                    type="number"
                                                    value={editValues.threshold}
                                                    onChange={(e) => setEditValues(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                                                    className="w-20 h-8 text-center"
                                                    min={0}
                                                />
                                            ) : (
                                                item.low_stock_threshold
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getStockBadge(item)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editingId === item.id ? (
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => saveEdit(item.id)}>
                                                        <Save className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                        <X className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
