import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    RotateCcw,
    Loader2,
    Package,
    Clock,
    CheckCircle2,
    X,
    Truck,
    ChevronRight,
    Store,
    AlertTriangle,
    Image as ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { returnService, type ReturnRequest } from "@/services/return.service";
import dayjs from "dayjs";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-4 w-4" /> },
    approved: { label: "Đã duyệt", color: "bg-blue-100 text-blue-700", icon: <CheckCircle2 className="h-4 w-4" /> },
    rejected: { label: "Từ chối", color: "bg-red-100 text-red-700", icon: <X className="h-4 w-4" /> },
    escalated: { label: "Đang khiếu nại", color: "bg-orange-100 text-orange-700", icon: <AlertTriangle className="h-4 w-4" /> },
    shipping: { label: "Đang gửi trả", color: "bg-purple-100 text-purple-700", icon: <Truck className="h-4 w-4" /> },
    received: { label: "Đã nhận hàng", color: "bg-indigo-100 text-indigo-700", icon: <Package className="h-4 w-4" /> },
    refunding: { label: "Đang hoàn tiền", color: "bg-orange-100 text-orange-700", icon: <RotateCcw className="h-4 w-4" /> },
    refunded: { label: "Đã hoàn tiền", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-4 w-4" /> },
    completed: { label: "Hoàn tất", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-4 w-4" /> },
    cancelled: { label: "Đã hủy", color: "bg-gray-100 text-gray-700", icon: <X className="h-4 w-4" /> },
};

export default function ReturnListPage() {
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [processing, setProcessing] = useState(false);
    
    // Dialog states
    const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
    const [showShipDialog, setShowShipDialog] = useState(false);
    const [showEscalateDialog, setShowEscalateDialog] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState("");
    const [shipper, setShipper] = useState("");
    const [escalateReason, setEscalateReason] = useState("");

    useEffect(() => {
        fetchReturns();
    }, [statusFilter]);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};
            if (statusFilter !== "all") {
                params.status = statusFilter;
            }
            const response = await returnService.getMyReturns(params);
            setReturns(response.data || []);
        } catch (error) {
            console.error("Failed to fetch returns:", error);
            toast.error("Không thể tải danh sách yêu cầu trả hàng");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Bạn có chắc muốn hủy yêu cầu này?")) return;

        setProcessing(true);
        try {
            await returnService.cancelReturn(id);
            toast.success("Đã hủy yêu cầu trả hàng");
            fetchReturns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể hủy yêu cầu");
        } finally {
            setProcessing(false);
        }
    };

    const handleShip = async () => {
        if (!trackingNumber.trim()) {
            toast.error("Vui lòng nhập mã vận đơn");
            return;
        }

        setProcessing(true);
        try {
            await returnService.shipReturn(selectedReturn!.id, {
                trackingNumber,
                shipper: shipper || undefined,
            });
            toast.success("Đã cập nhật thông tin gửi trả hàng");
            setShowShipDialog(false);
            setTrackingNumber("");
            setShipper("");
            fetchReturns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể cập nhật");
        } finally {
            setProcessing(false);
        }
    };

    const handleEscalate = async () => {
        if (!escalateReason.trim()) {
            toast.error("Vui lòng nhập lý do khiếu nại");
            return;
        }

        setProcessing(true);
        try {
            await returnService.escalateReturn(selectedReturn!.id, {
                reason: escalateReason,
            });
            toast.success("Đã gửi khiếu nại lên Admin");
            setShowEscalateDialog(false);
            setEscalateReason("");
            fetchReturns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể gửi khiếu nại");
        } finally {
            setProcessing(false);
        }
    };

    const openShipDialog = (rr: ReturnRequest) => {
        setSelectedReturn(rr);
        setTrackingNumber("");
        setShipper("");
        setShowShipDialog(true);
    };

    const openEscalateDialog = (rr: ReturnRequest) => {
        setSelectedReturn(rr);
        setEscalateReason("");
        setShowEscalateDialog(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-sm shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <RotateCcw className="h-6 w-6 text-shopee-orange" />
                        <h1 className="text-xl font-medium">Yêu cầu Trả hàng / Hoàn tiền</h1>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-sm shadow-sm">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="pending">Chờ xử lý</SelectItem>
                        <SelectItem value="approved">Đã duyệt</SelectItem>
                        <SelectItem value="shipping">Đang gửi trả</SelectItem>
                        <SelectItem value="refunded">Đã hoàn tiền</SelectItem>
                        <SelectItem value="rejected">Từ chối</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Return List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
                </div>
            ) : returns.length === 0 ? (
                <div className="bg-white p-12 rounded-sm shadow-sm text-center">
                    <RotateCcw className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-lg font-medium text-gray-700 mb-2">
                        Chưa có yêu cầu trả hàng nào
                    </h2>
                    <p className="text-gray-500 mb-6">
                        Bạn có thể yêu cầu trả hàng từ trang chi tiết đơn hàng
                    </p>
                    <Link to="/user/purchase">
                        <Button className="bg-shopee-orange hover:bg-shopee-orange/90">
                            Xem đơn hàng
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {returns.map((rr) => {
                        const statusConfig = STATUS_CONFIG[rr.status] || STATUS_CONFIG.pending;
                        
                        return (
                            <div
                                key={rr.id}
                                className="bg-white rounded-sm shadow-sm overflow-hidden"
                            >
                                {/* Header */}
                                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        {rr.shop?.logoUrl ? (
                                            <img
                                                src={rr.shop.logoUrl}
                                                alt={rr.shop.name}
                                                className="h-8 w-8 rounded"
                                            />
                                        ) : (
                                            <Store className="h-8 w-8 text-gray-400" />
                                        )}
                                        <div>
                                            <div className="font-medium">{rr.shop?.name || "Shop"}</div>
                                            <div className="text-xs text-gray-500">
                                                Mã yêu cầu: {rr.requestNumber}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className={statusConfig.color}>
                                        {statusConfig.icon}
                                        <span className="ml-1">{statusConfig.label}</span>
                                    </Badge>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <div className="text-sm">
                                                <span className="text-gray-500">Lý do: </span>
                                                <span className="font-medium">{rr.reasonLabel}</span>
                                            </div>
                                            {rr.reasonDetail && (
                                                <div className="text-sm text-gray-600">
                                                    {rr.reasonDetail}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500">
                                                Ngày tạo: {dayjs(rr.createdAt).format("DD/MM/YYYY HH:mm")}
                                            </div>
                                            {rr.shopResponse && (
                                                <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                                    <span className="text-gray-500">Phản hồi từ shop: </span>
                                                    {rr.shopResponse}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500">Số tiền hoàn</div>
                                            <div className="text-lg font-bold text-shopee-orange">
                                                {formatCurrency(rr.refundAmount)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                                    <div className="text-sm text-gray-500">
                                        {rr.requestType === "return" ? "Trả hàng & Hoàn tiền" : "Chỉ hoàn tiền"}
                                    </div>
                                    <div className="flex gap-2">
                                        {rr.status === "pending" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => handleCancel(rr.id)}
                                                disabled={processing}
                                            >
                                                Hủy yêu cầu
                                            </Button>
                                        )}
                                        {rr.status === "approved" && rr.requestType === "return" && (
                                            <Button
                                                size="sm"
                                                className="bg-shopee-orange hover:bg-shopee-orange/90"
                                                onClick={() => openShipDialog(rr)}
                                                disabled={processing}
                                            >
                                                <Truck className="h-4 w-4 mr-1" />
                                                Gửi hàng trả
                                            </Button>
                                        )}
                                        {rr.status === "rejected" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-orange-600 hover:text-orange-700"
                                                onClick={() => openEscalateDialog(rr)}
                                                disabled={processing}
                                            >
                                                <AlertTriangle className="h-4 w-4 mr-1" />
                                                Khiếu nại
                                            </Button>
                                        )}
                                        {rr.status === "shipping" && rr.returnTrackingNumber && (
                                            <div className="text-xs text-gray-500">
                                                Mã vận đơn: <span className="font-mono">{rr.returnTrackingNumber}</span>
                                            </div>
                                        )}
                                        <Link to={`/user/order/${rr.orderId}`}>
                                            <Button size="sm" variant="outline" className="gap-1">
                                                Xem đơn hàng
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Ship Dialog */}
            <Dialog open={showShipDialog} onOpenChange={setShowShipDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gửi hàng trả về Shop</DialogTitle>
                        <DialogDescription>
                            Vui lòng nhập thông tin vận chuyển sau khi đã gửi hàng
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Đơn vị vận chuyển</Label>
                            <Select value={shipper} onValueChange={setShipper}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn đơn vị vận chuyển" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GHN">Giao Hàng Nhanh</SelectItem>
                                    <SelectItem value="GHTK">Giao Hàng Tiết Kiệm</SelectItem>
                                    <SelectItem value="J&T">J&T Express</SelectItem>
                                    <SelectItem value="Viettel Post">Viettel Post</SelectItem>
                                    <SelectItem value="VNPost">VNPost</SelectItem>
                                    <SelectItem value="Ninja Van">Ninja Van</SelectItem>
                                    <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Mã vận đơn *</Label>
                            <Input
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Nhập mã vận đơn"
                            />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                            <p className="font-medium mb-1">Lưu ý:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Đóng gói hàng cẩn thận, giữ nguyên tem/nhãn</li>
                                <li>Chụp ảnh hàng trước khi gửi</li>
                                <li>Gửi hàng trong vòng 7 ngày kể từ khi được duyệt</li>
                            </ul>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowShipDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleShip}
                            disabled={processing || !trackingNumber.trim()}
                            className="bg-shopee-orange hover:bg-shopee-orange/90"
                        >
                            {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Xác nhận đã gửi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Escalate Dialog */}
            <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Khiếu nại lên Admin</DialogTitle>
                        <DialogDescription>
                            Nếu bạn không đồng ý với quyết định của Shop, bạn có thể khiếu nại để Admin xem xét
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {selectedReturn?.shopResponse && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700">
                                    <span className="font-medium">Lý do Shop từ chối:</span> {selectedReturn.shopResponse}
                                </p>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <Label>Lý do khiếu nại *</Label>
                            <Textarea
                                value={escalateReason}
                                onChange={(e) => setEscalateReason(e.target.value)}
                                placeholder="Mô tả chi tiết lý do bạn không đồng ý với quyết định của Shop..."
                                rows={4}
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                            Admin sẽ xem xét và phản hồi trong vòng 3-5 ngày làm việc
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleEscalate}
                            disabled={processing || !escalateReason.trim()}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Gửi khiếu nại
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
