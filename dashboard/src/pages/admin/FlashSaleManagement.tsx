import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Zap,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Calendar,
    Package,
    Eye,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/services/api";
import dayjs from "dayjs";

interface FlashSale {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    startTime: string;
    endTime: string;
    status: "draft" | "scheduled" | "active" | "ended" | "cancelled";
    maxProducts: number;
    bannerUrl: string | null;
    isFeatured: boolean;
    createdAt: string;
    products?: FlashSaleProduct[];
}

interface FlashSaleProduct {
    id: string;
    productId: string;
    originalPrice: number;
    flashPrice: number;
    discountPercent: number;
    flashStock: number;
    soldCount: number;
    remainingStock: number;
    limitPerUser: number;
    isActive: boolean;
    product: {
        id: string;
        name: string;
        slug: string;
        basePrice: number;
    } | null;
}

const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    ended: "bg-gray-100 text-gray-500",
    cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
    draft: "Nháp",
    scheduled: "Đã lên lịch",
    active: "Đang diễn ra",
    ended: "Đã kết thúc",
    cancelled: "Đã hủy",
};

export default function FlashSaleManagement() {
    const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showProductsDialog, setShowProductsDialog] = useState(false);
    const [selectedFlashSale, setSelectedFlashSale] = useState<FlashSale | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        startTime: "",
        endTime: "",
        maxProducts: 100,
        isFeatured: false,
    });
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        fetchFlashSales();
    }, [statusFilter]);

    const fetchFlashSales = async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};
            if (statusFilter !== "all") {
                params.status = statusFilter;
            }
            const response = await api.get("/admin/flash-sales", { params });
            setFlashSales(response.data.data || []);
        } catch (error) {
            console.error("Failed to fetch flash sales:", error);
            toast.error("Không thể tải danh sách Flash Sale");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.startTime || !formData.endTime) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }

        setSaving(true);
        try {
            if (selectedFlashSale) {
                await api.put(`/admin/flash-sales/${selectedFlashSale.id}`, formData);
                toast.success("Cập nhật Flash Sale thành công");
            } else {
                await api.post("/admin/flash-sales", formData);
                toast.success("Tạo Flash Sale thành công");
            }
            setShowCreateDialog(false);
            resetForm();
            fetchFlashSales();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Có lỗi xảy ra");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa Flash Sale này?")) return;

        try {
            await api.delete(`/admin/flash-sales/${id}`);
            toast.success("Đã xóa Flash Sale");
            fetchFlashSales();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể xóa");
        }
    };

    const handleEdit = (flashSale: FlashSale) => {
        setSelectedFlashSale(flashSale);
        setFormData({
            name: flashSale.name,
            description: flashSale.description || "",
            startTime: dayjs(flashSale.startTime).format("YYYY-MM-DDTHH:mm"),
            endTime: dayjs(flashSale.endTime).format("YYYY-MM-DDTHH:mm"),
            maxProducts: flashSale.maxProducts,
            isFeatured: flashSale.isFeatured,
        });
        setShowCreateDialog(true);
    };

    const handleViewProducts = async (flashSale: FlashSale) => {
        try {
            const response = await api.get(`/admin/flash-sales/${flashSale.id}`);
            setSelectedFlashSale(response.data.flashSale);
            setShowProductsDialog(true);
        } catch (error) {
            toast.error("Không thể tải sản phẩm");
        }
    };

    const resetForm = () => {
        setSelectedFlashSale(null);
        setFormData({
            name: "",
            description: "",
            startTime: "",
            endTime: "",
            maxProducts: 100,
            isFeatured: false,
        });
    };

    const getTimeRemaining = (endTime: string) => {
        const end = dayjs(endTime);
        const now = dayjs();
        if (end.isBefore(now)) return "Đã kết thúc";
        
        const hours = end.diff(now, "hour");
        const minutes = end.diff(now, "minute") % 60;
        
        if (hours > 24) {
            return `${Math.floor(hours / 24)} ngày`;
        }
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Zap className="h-6 w-6 text-shopee-orange" />
                    <h1 className="text-2xl font-bold">Quản lý Flash Sale</h1>
                </div>
                <Button
                    onClick={() => {
                        resetForm();
                        setShowCreateDialog(true);
                    }}
                    className="bg-shopee-orange hover:bg-shopee-orange/90 gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Tạo Flash Sale
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="draft">Nháp</SelectItem>
                        <SelectItem value="scheduled">Đã lên lịch</SelectItem>
                        <SelectItem value="active">Đang diễn ra</SelectItem>
                        <SelectItem value="ended">Đã kết thúc</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
                    </div>
                ) : flashSales.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        Chưa có Flash Sale nào
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tên</TableHead>
                                <TableHead>Thời gian</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Còn lại</TableHead>
                                <TableHead>Nổi bật</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {flashSales.map((fs) => (
                                <TableRow key={fs.id}>
                                    <TableCell>
                                        <div className="font-medium">{fs.name}</div>
                                        {fs.description && (
                                            <div className="text-sm text-gray-500 truncate max-w-xs">
                                                {fs.description}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {dayjs(fs.startTime).format("DD/MM HH:mm")}
                                            </div>
                                            <div className="text-gray-500">
                                                → {dayjs(fs.endTime).format("DD/MM HH:mm")}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={statusColors[fs.status]}>
                                            {statusLabels[fs.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {fs.status === "active" ? (
                                            <span className="text-shopee-orange font-medium">
                                                {getTimeRemaining(fs.endTime)}
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {fs.isFeatured ? (
                                            <Badge className="bg-yellow-100 text-yellow-700">
                                                ⭐ Nổi bật
                                            </Badge>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleViewProducts(fs)}
                                            >
                                                <Package className="h-4 w-4" />
                                            </Button>
                                            {!["ended", "cancelled"].includes(fs.status) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(fs)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {fs.status === "draft" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => handleDelete(fs.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedFlashSale ? "Chỉnh sửa Flash Sale" : "Tạo Flash Sale mới"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Tên Flash Sale *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="VD: Flash Sale 12.12"
                            />
                        </div>
                        <div>
                            <Label>Mô tả</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Mô tả ngắn về chương trình"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Bắt đầu *</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Kết thúc *</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Số sản phẩm tối đa</Label>
                            <Input
                                type="number"
                                value={formData.maxProducts}
                                onChange={(e) => setFormData({ ...formData, maxProducts: parseInt(e.target.value) || 100 })}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.isFeatured}
                                onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                            />
                            <Label>Hiển thị nổi bật trên trang chủ</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={saving}
                            className="bg-shopee-orange hover:bg-shopee-orange/90"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {selectedFlashSale ? "Cập nhật" : "Tạo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Products Dialog */}
            <Dialog open={showProductsDialog} onOpenChange={setShowProductsDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            Sản phẩm trong "{selectedFlashSale?.name}"
                        </DialogTitle>
                    </DialogHeader>
                    {selectedFlashSale?.products && selectedFlashSale.products.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sản phẩm</TableHead>
                                    <TableHead>Giá gốc</TableHead>
                                    <TableHead>Giá Flash</TableHead>
                                    <TableHead>Giảm</TableHead>
                                    <TableHead>Kho</TableHead>
                                    <TableHead>Đã bán</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedFlashSale.products.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {p.product?.name || "N/A"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500 line-through">
                                            {formatCurrency(p.originalPrice)}
                                        </TableCell>
                                        <TableCell className="text-shopee-orange font-bold">
                                            {formatCurrency(p.flashPrice)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-red-100 text-red-700">
                                                -{p.discountPercent}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{p.flashStock}</TableCell>
                                        <TableCell>
                                            <span className="text-green-600">{p.soldCount}</span>
                                            <span className="text-gray-400"> / {p.flashStock}</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Chưa có sản phẩm nào trong Flash Sale này
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
