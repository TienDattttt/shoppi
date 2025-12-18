import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    RotateCcw,
    Loader2,
    Package,
    Clock,
    CheckCircle2,
    X,
    Truck,
    Eye,
    ThumbsUp,
    ThumbsDown,
    DollarSign,
    Image as ImageIcon,
    Phone,
    Mail,
    AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { returnService, type ReturnRequest } from "@/services/return.service";
import dayjs from "dayjs";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-4 w-4" /> },
    approved: { label: "Đã duyệt", color: "bg-blue-100 text-blue-700", icon: <CheckCircle2 className="h-4 w-4" /> },
    rejected: { label: "Từ chối", color: "bg-red-100 text-red-700", icon: <X className="h-4 w-4" /> },
    escalated: { label: "Khiếu nại", color: "bg-orange-100 text-orange-700", icon: <AlertTriangle className="h-4 w-4" /> },
    shipping: { label: "Đang gửi trả", color: "bg-purple-100 text-purple-700", icon: <Truck className="h-4 w-4" /> },
    received: { label: "Đã nhận hàng", color: "bg-indigo-100 text-indigo-700", icon: <Package className="h-4 w-4" /> },
    refunding: { label: "Đang hoàn tiền", color: "bg-orange-100 text-orange-700", icon: <RotateCcw className="h-4 w-4" /> },
    refunded: { label: "Đã hoàn tiền", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-4 w-4" /> },
    completed: { label: "Hoàn tất", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-4 w-4" /> },
    cancelled: { label: "Đã hủy", color: "bg-gray-100 text-gray-700", icon: <X className="h-4 w-4" /> },
};

export default function ReturnManagement() {
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("pending");
    
    // Dialog states
    const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [processing, setProcessing] = useState(false);

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
            const response = await returnService.getShopReturns(params);
            setReturns(response.data || []);
        } catch (error) {
            console.error("Failed to fetch returns:", error);
            toast.error("Không thể tải danh sách yêu cầu trả hàng");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (rr: ReturnRequest) => {
        if (!confirm("Bạn có chắc muốn duyệt yêu cầu trả hàng này?")) return;
        
        setProcessing(true);
        try {
            await returnService.approveReturn(rr.id, "Đồng ý yêu cầu trả hàng");
            toast.success("Đã duyệt yêu cầu trả hàng");
            fetchReturns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể duyệt yêu cầu");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error("Vui lòng nhập lý do từ chối");
            return;
        }
        
        setProcessing(true);
        try {
            await returnService.rejectReturn(selectedReturn!.id, rejectReason);
            toast.success("Đã từ chối yêu cầu trả hàng");
            setShowRejectDialog(false);
            setRejectReason("");
            fetchReturns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể từ chối yêu cầu");
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmReceived = async (rr: ReturnRequest) => {
        if (!confirm("Xác nhận đã nhận được hàng trả?")) return;
        
        setProcessing(true);
        try {
            await returnService.confirmReceived(rr.id);
            toast.success("Đã xác nhận nhận hàng");
            fetchReturns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể xác nhận");
        } finally {
            setProcessing(false);
        }
    };

    const handleRefund = async (rr: ReturnRequest) => {
        if (!confirm(`Xác nhận hoàn tiền ${formatCurrency(rr.refundAmount)} cho khách hàng?`)) return;
        
        setProcessing(true);
        try {
            await returnService.processRefund(rr.id);
            toast.success("Đã hoàn tiền thành công");
            fetchReturns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể hoàn tiền");
        } finally {
            setProcessing(false);
        }
    };

    const openDetail = (rr: ReturnRequest) => {
        setSelectedReturn(rr);
        setShowDetailDialog(true);
    };

    const openRejectDialog = (rr: ReturnRequest) => {
        setSelectedReturn(rr);
        setRejectReason("");
        setShowRejectDialog(true);
    };

    const openEvidenceDialog = (rr: ReturnRequest) => {
        setSelectedReturn(rr);
        setShowEvidenceDialog(true);
    };

    // Count by status
    const pendingCount = returns.filter(r => r.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <RotateCcw className="h-6 w-6 text-blue-600" />
                    <h1 className="text-2xl font-bold">Quản lý Trả hàng / Hoàn tiền</h1>
                    {pendingCount > 0 && (
                        <Badge variant="destructive">{pendingCount} chờ xử lý</Badge>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="pending">Chờ xử lý</SelectItem>
                        <SelectItem value="approved">Đã duyệt</SelectItem>
                        <SelectItem value="shipping">Đang gửi trả</SelectItem>
                        <SelectItem value="received">Đã nhận hàng</SelectItem>
                        <SelectItem value="refunded">Đã hoàn tiền</SelectItem>
                        <SelectItem value="rejected">Từ chối</SelectItem>
                        <SelectItem value="escalated">Khiếu nại</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : returns.length === 0 ? (
                    <div className="text-center py-20">
                        <RotateCcw className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Không có yêu cầu trả hàng nào</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã yêu cầu</TableHead>
                                <TableHead>Khách hàng</TableHead>
                                <TableHead>Sản phẩm</TableHead>
                                <TableHead>Lý do</TableHead>
                                <TableHead>Số tiền hoàn</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returns.map((rr) => {
                                const statusConfig = STATUS_CONFIG[rr.status] || STATUS_CONFIG.pending;
                                const firstItem = rr.items?.[0];
                                
                                return (
                                    <TableRow key={rr.id}>
                                        <TableCell className="font-medium">
                                            {rr.requestNumber}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{rr.customer?.name}</div>
                                                <div className="text-xs text-gray-500">{rr.customer?.phone}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {firstItem?.productImage ? (
                                                    <img 
                                                        src={firstItem.productImage} 
                                                        alt="" 
                                                        className="h-10 w-10 object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                                                        <Package className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium line-clamp-1">
                                                        {firstItem?.productName || 'N/A'}
                                                    </div>
                                                    {rr.items && rr.items.length > 1 && (
                                                        <div className="text-xs text-gray-500">
                                                            +{rr.items.length - 1} sản phẩm khác
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{rr.reasonLabel}</div>
                                            {rr.evidenceUrls && rr.evidenceUrls.length > 0 && (
                                                <button
                                                    onClick={() => openEvidenceDialog(rr)}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                >
                                                    <ImageIcon className="h-3 w-3" />
                                                    {rr.evidenceUrls.length} ảnh
                                                </button>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-orange-600">
                                            {formatCurrency(rr.refundAmount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusConfig.color}>
                                                {statusConfig.icon}
                                                <span className="ml-1">{statusConfig.label}</span>
                                            </Badge>
                                            {rr.expiresAt && rr.status === 'pending' && (
                                                <div className="text-xs text-red-500 mt-1">
                                                    Hết hạn: {dayjs(rr.expiresAt).format("DD/MM HH:mm")}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {dayjs(rr.createdAt).format("DD/MM/YYYY HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openDetail(rr)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                
                                                {rr.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 hover:text-green-700"
                                                            onClick={() => handleApprove(rr)}
                                                            disabled={processing}
                                                        >
                                                            <ThumbsUp className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 hover:text-red-700"
                                                            onClick={() => openRejectDialog(rr)}
                                                            disabled={processing}
                                                        >
                                                            <ThumbsDown className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                
                                                {rr.status === 'shipping' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleConfirmReceived(rr)}
                                                        disabled={processing}
                                                    >
                                                        <Package className="h-4 w-4 mr-1" />
                                                        Nhận hàng
                                                    </Button>
                                                )}
                                                
                                                {rr.status === 'received' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleRefund(rr)}
                                                        disabled={processing}
                                                    >
                                                        <DollarSign className="h-4 w-4 mr-1" />
                                                        Hoàn tiền
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Chi tiết yêu cầu trả hàng</DialogTitle>
                    </DialogHeader>
                    
                    {selectedReturn && (
                        <div className="space-y-6">
                            {/* Request Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Mã yêu cầu:</span>
                                    <span className="ml-2 font-medium">{selectedReturn.requestNumber}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Loại:</span>
                                    <span className="ml-2">{selectedReturn.requestType === 'return' ? 'Trả hàng & Hoàn tiền' : 'Chỉ hoàn tiền'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Ngày tạo:</span>
                                    <span className="ml-2">{dayjs(selectedReturn.createdAt).format("DD/MM/YYYY HH:mm")}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Trạng thái:</span>
                                    <Badge className={`ml-2 ${STATUS_CONFIG[selectedReturn.status]?.color}`}>
                                        {STATUS_CONFIG[selectedReturn.status]?.label}
                                    </Badge>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium mb-2">Thông tin khách hàng</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{selectedReturn.customer?.name}</span>
                                    </div>
                                    {selectedReturn.customer?.phone && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Phone className="h-4 w-4" />
                                            {selectedReturn.customer.phone}
                                        </div>
                                    )}
                                    {selectedReturn.customer?.email && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Mail className="h-4 w-4" />
                                            {selectedReturn.customer.email}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <h4 className="font-medium mb-2">Lý do trả hàng</h4>
                                <div className="bg-yellow-50 p-3 rounded-lg">
                                    <div className="font-medium text-yellow-800">{selectedReturn.reasonLabel}</div>
                                    {selectedReturn.reasonDetail && (
                                        <div className="text-sm text-yellow-700 mt-1">{selectedReturn.reasonDetail}</div>
                                    )}
                                </div>
                            </div>

                            {/* Evidence */}
                            {selectedReturn.evidenceUrls && selectedReturn.evidenceUrls.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Hình ảnh minh chứng</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {selectedReturn.evidenceUrls.map((url, idx) => (
                                            <img
                                                key={idx}
                                                src={url}
                                                alt={`Evidence ${idx + 1}`}
                                                className="h-24 w-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                                onClick={() => window.open(url, '_blank')}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Items */}
                            <div>
                                <h4 className="font-medium mb-2">Sản phẩm trả</h4>
                                <div className="space-y-2">
                                    {selectedReturn.items?.map((item) => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            {item.productImage ? (
                                                <img src={item.productImage} alt="" className="h-16 w-16 object-cover rounded" />
                                            ) : (
                                                <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center">
                                                    <Package className="h-6 w-6 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="font-medium">{item.productName}</div>
                                                {item.variantName && (
                                                    <div className="text-sm text-gray-500">{item.variantName}</div>
                                                )}
                                                <div className="text-sm">x{item.quantity}</div>
                                            </div>
                                            <div className="text-orange-600 font-medium">
                                                {formatCurrency(item.totalPrice)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Refund Amount */}
                            <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                                <span className="font-medium">Tổng tiền hoàn:</span>
                                <span className="text-2xl font-bold text-orange-600">
                                    {formatCurrency(selectedReturn.refundAmount)}
                                </span>
                            </div>

                            {/* Return Shipping Info */}
                            {selectedReturn.returnTrackingNumber && (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h4 className="font-medium mb-2">Thông tin gửi trả</h4>
                                    <div className="text-sm space-y-1">
                                        <div>Đơn vị vận chuyển: {selectedReturn.returnShipper || 'N/A'}</div>
                                        <div>Mã vận đơn: <span className="font-mono">{selectedReturn.returnTrackingNumber}</span></div>
                                        {selectedReturn.shippedAt && (
                                            <div>Ngày gửi: {dayjs(selectedReturn.shippedAt).format("DD/MM/YYYY HH:mm")}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Shop Response */}
                            {selectedReturn.shopResponse && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium mb-2">Phản hồi của Shop</h4>
                                    <p className="text-sm">{selectedReturn.shopResponse}</p>
                                    {selectedReturn.shopRespondedAt && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {dayjs(selectedReturn.shopRespondedAt).format("DD/MM/YYYY HH:mm")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối yêu cầu trả hàng</DialogTitle>
                        <DialogDescription>
                            Vui lòng nhập lý do từ chối. Khách hàng có thể khiếu nại lên Admin nếu không đồng ý.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do từ chối..."
                            rows={4}
                        />
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={processing || !rejectReason.trim()}
                        >
                            {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Từ chối
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Evidence Dialog */}
            <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Hình ảnh minh chứng</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {selectedReturn?.evidenceUrls?.map((url, idx) => (
                            <img
                                key={idx}
                                src={url}
                                alt={`Evidence ${idx + 1}`}
                                className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() => window.open(url, '_blank')}
                            />
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
